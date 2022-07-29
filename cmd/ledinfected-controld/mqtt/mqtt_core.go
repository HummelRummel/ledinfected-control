package mqtt

import (
	"fmt"
	paho_mqtt "github.com/eclipse/paho.mqtt.golang"
	"math/rand"
	"strings"
	"time"
)

type (
	Core struct {
		client                  paho_mqtt.Client
		onConnectStatusCallback func()
		abstractMessageHandlers []abstractMessageHandlers
		topicPrefix             string
	}

	abstractMessageHandlers struct {
		abstractID string
		callback   func(topic string, msg string)
	}
)

func NewCore(url string) (*Core, error) {
	o := &Core{}
	mqtt_opts := paho_mqtt.NewClientOptions().AddBroker(url).SetClientID(fmt.Sprintf("ledinfect-controld-%d", rand.Uint32()))

	mqtt_opts.SetKeepAlive(60 * time.Second)
	mqtt_opts.SetAutoReconnect(true)
	mqtt_opts.SetOnConnectHandler(o.onConnectHandler)
	mqtt_opts.SetPingTimeout(1 * time.Second)

	o.client = paho_mqtt.NewClient(mqtt_opts)

	return o, nil
}

func (o *Core) onConnectHandler(client paho_mqtt.Client) {
	fmt.Printf("connected to mqtt\n")
	if o.onConnectStatusCallback != nil {
		o.onConnectStatusCallback()
	}
}

func (o *Core) Run(topicPrefix string, subscribedTopics []string, onConnectStatusCallback func()) error {
	o.onConnectStatusCallback = onConnectStatusCallback
	o.topicPrefix = topicPrefix

	for {
		if err := o.Connect(); err == nil {
			break
		}
		fmt.Printf("WARN: failed to connect to mqtt, retrying...\n")
		time.Sleep(time.Second)
	}
	for _, topic := range subscribedTopics {
		if err := o.subscribe(topic, 1); err != nil {
			return err
		}
	}
	return nil
}

func (o *Core) Connect() error {
	if token := o.client.Connect(); token.Wait() && token.Error() != nil {
		return token.Error()
	}
	return nil
}

func (o *Core) messageDispatcher(client paho_mqtt.Client, msg paho_mqtt.Message) {
	for _, h := range o.abstractMessageHandlers {
		allTopicPrefix := o.topicPrefix + "/all"
		abstractTopicPrefix := o.topicPrefix + "/" + h.abstractID
		if strings.HasPrefix(msg.Topic(), allTopicPrefix) {
			topic := msg.Topic()
			topic = topic[len(allTopicPrefix)+1:]
			h.callback(topic, string(msg.Payload()))
		} else if strings.HasPrefix(msg.Topic(), abstractTopicPrefix) {
			topic := msg.Topic()
			topic = topic[len(abstractTopicPrefix)+1:]
			h.callback(topic, string(msg.Payload()))
		}
	}
}

func (o *Core) subscribe(topic string, qos byte) error {
	// Subscribe to a topic
	token := o.client.Subscribe(topic, qos, o.messageDispatcher)
	token.Wait()
	return nil
}

func (o *Core) Publish(topic string, qos byte, retained bool, payload string) error {
	if token := o.client.Publish(topic, qos, retained, payload); token.Wait() && token.Error() != nil {
		return token.Error()
	}
	return nil
}

func (o *Core) RegisterAbstractCallback(abstractID string, callback func(topic string, msg string)) error {
	for _, h := range o.abstractMessageHandlers {
		if h.abstractID == abstractID {
			return fmt.Errorf("abstract %s already registered", abstractID)
		}
	}
	o.abstractMessageHandlers = append(o.abstractMessageHandlers, abstractMessageHandlers{
		abstractID: abstractID,
		callback:   callback,
	})
	return nil
}
