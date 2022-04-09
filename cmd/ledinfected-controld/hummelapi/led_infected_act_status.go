package hummelapi

import "fmt"

type (
	LEDInfectedActStatus struct {
		State       string            `json:"state"`
		ActiveScene *LEDInfectedScene `json:"active_scene"`
		Errors      []string          `json:"errors"`
	}
)

func (o *LEDInfectedActStatus) appendError(err error) {
	fmt.Printf("%s\n", err)
	o.Errors = append(o.Errors, err.Error())
}
