package hummelapi

import "fmt"

type (
	HummelArduino struct {
		connection *HummelArduinoConnection

		CircleStripe  *HummelArduinoLedStripe
		RadialStripes [4]*HummelArduinoLedStripe
	}
)

func NewHummelArduino(devFile string) (*HummelArduino, error) {
	connection, err := NewHummelArduinoConnection(devFile)
	if err != nil {
		return nil, err
	}
	o := &HummelArduino{
		connection:    connection,
		CircleStripe:  &HummelArduinoLedStripe{
			connection: connection, stripeType: hummelCommandTypeCircle, setupType: hummelCommandTypeSetupCircle,
		},
		RadialStripes: [4]*HummelArduinoLedStripe{
			{connection: connection, stripeType: hummelCommandTypeRadial1, setupType: hummelCommandTypeSetupRadial1},
			{connection: connection, stripeType: hummelCommandTypeRadial2, setupType: hummelCommandTypeSetupRadial2},
			{connection: connection, stripeType: hummelCommandTypeRadial3, setupType: hummelCommandTypeSetupRadial3},
			{connection: connection, stripeType: hummelCommandTypeRadial4, setupType: hummelCommandTypeSetupRadial4},
		},
	}

	config, err := o.GetConfig()
	if err != nil {
		fmt.Printf("failed to get config for arduino %d connected to %s", connection.GetId(), devFile)
	}

	for _, s:= range o.RadialStripes {
		for _, cs:=range config.Radials {
			stripeType := uint8(0);
			if cs.StripeID == nil {
				fmt.Printf("stripeID not set")
				continue
			}
			stripeType = stripeIDToStripeType(*cs.StripeID)
			if s.stripeType == stripeType {
				s.currentConfig = cs
				break
			}

		}
	}

	return o, nil
}

func stripeIDToStripeType(stripeID string) uint8 {
	var stripeType uint8
	switch stripeID {
	case "radial1":
		stripeType = hummelCommandTypeRadial1
	case "radial2":
		stripeType = hummelCommandTypeRadial2
	case "radial3":
		stripeType = hummelCommandTypeRadial3
	case "radial4":
		stripeType = hummelCommandTypeRadial4
	}
	return stripeType
}

func (o *HummelArduino) Close() {
	o.connection.Close()
}

func (o *HummelArduino) GetDevFile() string {
	return o.connection.GetDevFile()
}

func (o *HummelArduino) GetID() uint8 {
	return o.connection.GetId()
}

func (o *HummelArduino) SetID(id uint8) error {
	_, err := o.connection.HummelCommand(hummelCommandTypeGlobal, hummelCommandCodeGlobalSetId, []byte{id})
	return err
}

func (o *HummelArduino) GetConfig() (*HummelArduinoConfig, error) {
	response, err := o.connection.HummelCommand(hummelCommandTypeGlobal, hummelCommandCodeGlobalGetConfig, nil)
	if err != nil {
		return nil, err
	}

	idSize := 1
	ledConfigSize := 2
	baseConfgSize := 3
	paletteSize := 48 // 16 * 3
	stripeSize := ledConfigSize + baseConfgSize + paletteSize
	configSize := idSize + (5 * stripeSize)

	stripBaseOffset := 1 // only the id comes in from

	if len(response.data) != configSize {
		return nil, fmt.Errorf("unexpected config size, expected (%d), got %d", configSize, len(response.data))
	}

	readNextStripeConfig := func(stripeID string, indexOffset int) (*HummelArduinoLedStripeConfig, error) {
		pinConfig, err := castStripePinConfig(response.data, indexOffset)
		if err != nil {
			return nil, err
		}
		baseConfig, err := castStripeBaseConfig(response.data, indexOffset+2)
		if err != nil {
			return nil, err
		}

		palette, err := castStripePalatteConfig(response.data, indexOffset+5)
		if err != nil {
			return nil, err
		}

		return &HummelArduinoLedStripeConfig{
			StripeID: &stripeID,
			Pin:      pinConfig,
			Base:     baseConfig,
			Palette:  palette,
		}, nil
	}

	devFile := o.GetDevFile();
	id := response.data[0];
	c := &HummelArduinoConfig{
		DevFile: &devFile,
		ID:      &id,
	}

	c.Circle, err = readNextStripeConfig("circle", stripBaseOffset+0)
	if err != nil {
		return nil, fmt.Errorf("failed to read Circle stripe config: %s", err)
	}

	for i := 0; i < 4; i++ {
		c.Radials[i], err = readNextStripeConfig(fmt.Sprintf("radial%d", i+1), stripBaseOffset+((paletteSize+5)*(i+1)))
		if err != nil {
			return nil, fmt.Errorf("failed to read radial %d stripe config: %s", i, err)
		}
	}

	return c, nil
}

func (o *HummelArduino) Sync(timestamps [5]uint8) error {
	if _, err := o.connection.HummelCommand(hummelCommandTypeGlobal, hummelCommandCodeGlobalSetId, []byte{timestamps[0], timestamps[1], timestamps[2], timestamps[3], timestamps[4]}); err != nil {
		return err
	}
	return nil
}
