package hummelapi

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
)

const presetDir = "./presets"

type (
	LEDInfectedPreset struct {
		PresetID string                                 `json:"preset_id"`
		Name     string                                 `json:"name"`
		Config   *LEDInfectedArduinoConfigStripeConfig  `json:"config"`
		Palette  *LEDInfectedArduinoConfigStripePalette `json:"palette"`
	}
)

func GetAllPresets() []*LEDInfectedPreset {
	presets := []*LEDInfectedPreset{}

	matches, err := filepath.Glob(presetDir + "/*.json")
	if err != nil {
		return presets
	}
	for _, m := range matches {
		buf, err := os.ReadFile(m)
		if err != nil {
			fmt.Printf("failed to read %s: %s\n", m, err)
			continue
		}
		preset := &LEDInfectedPreset{}
		err = json.Unmarshal(buf, preset)
		if err != nil {
			fmt.Printf("failed to unmarshal %s: %s\n", m, err)
			continue
		}

		if preset.PresetID == "" {
			fmt.Printf("invalid preset: no preset ID %s: %s\n", m, err)
			continue
		}

		presets = append(presets, preset)
	}
	return presets
}

func UpdatePreset(preset *LEDInfectedPreset) error {
	if preset.PresetID == "" {
		return fmt.Errorf("no preset id given")
	}
	if preset.Config == nil && preset.Palette == nil {
		return fmt.Errorf("given preset %s is empty", preset.Name)
	}
	return preset.update()
}

func (o *LEDInfectedPreset) update() error {
	jsonedPreset, err := json.Marshal(o)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(presetDir, 0755); err != nil {
		return err
	}
	return ioutil.WriteFile(presetDir+"/"+o.Name+".json", jsonedPreset, 0644)
}
