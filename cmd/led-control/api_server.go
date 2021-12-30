package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/nbmoa/led-control/cmd/led-control/hummelapi"
	"net/http"
	"path/filepath"
	"sync"
	"time"
)

type (
	apiServer struct {
		arduinos []*hummelapi.HummelArduino

		engine *gin.Engine
		stop_  chan struct{}
	}
)

func newApiServer() (*apiServer, error) {
	o := &apiServer{
		engine: gin.Default(),
		stop_:  make(chan struct{}),
	}

	return o, nil
}

func (o *apiServer) run() {
	wg := sync.WaitGroup{}

	o.registerEndpoints()

	wg.Add(1)
	go func() {
		defer wg.Done()
		o.arduinoConnectionHandler()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		o.engine.Run("localhost:8081")
	}()

	wg.Wait()
}

func (o *apiServer) registerEndpoints() {
	o.engine.GET("/config", o.getSingleConfigCallback)
	o.engine.GET("/dev/:devFile/config", o.getConfigCallback)
}

func (o *apiServer) getConfigCallback(c *gin.Context) {
	devFile := c.Param("devFile")

	for _, a := range o.arduinos {
		if a.GetDevFile() == devFile {
			arduinoConfig, err := a.GetConfig()
			if err != nil {
				fmt.Printf("failed to read config: %s\n", err)
			}
			c.JSON(http.StatusOK, arduinoConfig)
		}
	}
	c.String(http.StatusNotFound, "")
}

func (o *apiServer) getSingleConfigCallback(c *gin.Context) {
	if len(o.arduinos) == 1 {
		arduinoConfig, err := o.arduinos[0].GetConfig()
		if err != nil {
			fmt.Printf("failed to read config: %s\n", err)
			c.String(http.StatusServiceUnavailable, "")
			return
		}
		c.JSON(http.StatusOK, arduinoConfig)
		return
	}
	fmt.Printf("no or more then one arduino found\n")
	c.String(http.StatusNotFound, "")
}

func (o *apiServer) stop() {
	close(o.stop_)
}
func (o *apiServer) arduinoConnectionHandler() {
	ticker := time.NewTicker(time.Second)

	for {
		select {
		case <-ticker.C:
			// check the OSX device files
			matches, err := filepath.Glob("/dev/tty.usbserial*")
			if err != nil {
				// check the linux device files
				matches, err = filepath.Glob("/dev/ttyUSB*")
				if err != nil {
					// try again in 10 sec
					time.Sleep(time.Second * 10)
					continue
				}
			}

			for _, devFile := range matches {
				alreadyAdded := false
				for _, arduino := range o.arduinos {
					if arduino.GetDevFile() == devFile {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					fmt.Printf("trying to connect arduino connected via dev-file %s\n", devFile)
					arduino, err := hummelapi.NewHummelArduino(devFile)
					if err != nil {
						fmt.Printf("failed to get arduino: %s\n", err)
					} else {
						o.arduinos = append(o.arduinos, arduino)
					}
				}
			}
			var ardus []*hummelapi.HummelArduino

			for _, arduino := range o.arduinos {
				found := false
				for _, devFile := range matches {
					if arduino.GetDevFile() == devFile {
						found = true
						break
					}
				}
				if !found {
					fmt.Printf("trying to remove arduino connected via dev-file %s\n", arduino.GetDevFile())
					arduino.Close()
					// remove device
				} else {
					ardus = append(ardus, arduino)
				}
			}
			o.arduinos = ardus
		case <-o.stop_:
			return
		}
	}
}
