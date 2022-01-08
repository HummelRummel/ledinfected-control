package main

import (
	"fmt"
	"os"
	"sync"
)

func main() {

	argsWithProg := os.Args

	customComDev := ""
	if len(argsWithProg) > 1 {
		customComDev = argsWithProg[1]
	}
	//connection, err := hummelapi.NewHummelArduinoConnection("/dev/tty.usbserial-1440")
	//if err != nil {
	//	fmt.Printf("failed to open serial port: %s", err)
	//	return
	//}
	//defer connection.Close()
	//
	//router := gin.Default()
	//router.POST("/movement/direction", serial.changeDirection)
	//router.POST("/movement/speed/inc", serial.incrementSpeed)
	//router.POST("/movement/speed/dec", serial.decrementSpeed)
	//router.POST("/movement/speed/stop", serial.StopSpeed)
	//router.POST("/movement/speed/default", serial.DefaultSpeed)
	//router.POST("/pal", serial.SetPalStripe1)

	//router.Run("localhost:8080")

	apiSrv, err := newApiServer(customComDev)
	if err != nil {
		fmt.Printf("failed to create api server: %s", err)
		return
	}

	wg := sync.WaitGroup{}

	wg.Add(1)
	go func() {
		defer wg.Done()
		apiSrv.run()
	}()


	wg.Wait()
}
