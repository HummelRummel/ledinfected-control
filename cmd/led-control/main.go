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

	//obj := hummelapi.HummelControlObject{
	//	ID:        "PerformanceBlume1",
	//	ImgBaseID: "pbv1",
	//	Position: hummelapi.HummelControlObjectPosition{
	//		X: 40,
	//		Y: 40,
	//	},
	//	LEDConfig: hummelapi.HummelControlObjectLEDConfig{
	//		PatternCorrection: 0,
	//		CircleStripes: []hummelapi.HummelControlObjectLEDCircleStripe{
	//			{
	//				ArduinoID:     1,
	//				StripeID:      "",
	//				LEDLineSetups: nil,
	//				IsVirtual:     true,
	//			},
	//		},
	//		RadialStripes: []hummelapi.HummelControlObjectLEDRadialStripe{
	//			{
	//				ArduinoID: 1,
	//				StripeID:  "radial1",
	//				RadialPos: 0,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 1,
	//				StripeID:  "radial2",
	//				RadialPos: 1,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 1,
	//				StripeID:  "radial3",
	//				RadialPos: 2,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 1,
	//				StripeID:  "radial4",
	//				RadialPos: 3,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 2,
	//				StripeID:  "radial1",
	//				RadialPos: 4,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 2,
	//				StripeID:  "radial2",
	//				RadialPos: 5,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 2,
	//				StripeID:  "radial3",
	//				RadialPos: 6,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//			{
	//				ArduinoID: 2,
	//				StripeID:  "radial4",
	//				RadialPos: 7,
	//				LEDLineSetups: []hummelapi.HummelControlObjectLEDLineSetup{
	//					{
	//						Index:     0,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     1,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//					{
	//						Index:     2,
	//						NumLEDS:   8,
	//						LedOffset: 0,
	//					},
	//					{
	//						Index:     3,
	//						NumLEDS:   5,
	//						LedOffset: 3,
	//					},
	//				},
	//			},
	//		},
	//	},
	//}
	//res, err := json.Marshal(obj)
	//fmt.Println(string(res))

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
