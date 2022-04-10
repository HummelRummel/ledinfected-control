package hummelapi

import "fmt"

type (
	LEDInfectedScene struct {
		SceneID     string                    `json:"scene_id"`
		Description string                    `json:"description"`
		Effects     []*LEDInfectedSceneEffect `json:"effects"`

		Transitions []*LEDInfectedSceneTransition `json:"transitions"`
	}
)

func (o *LEDInfectedScene) Run() error {
	fmt.Printf("-- RUNNING SCENE %s\n", o.SceneID)
	var lastErr error

	for _, e := range o.Effects {
		if err := e.Show(); err != nil {
			lastErr = err
		}
	}

	for _, t := range o.Transitions {
		if err := t.Run(); err != nil {
			lastErr = err
		}
	}

	return lastErr
}

func (o *LEDInfectedScene) Stop() error {
	fmt.Printf("-- STOPPING SCENE %s\n", o.SceneID)
	var lastErr error
	for _, t := range o.Transitions {
		if err := t.Stop(); err != nil {
			lastErr = err
		}
	}
	return lastErr
}
