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
		PresetID   string                                 `json:"preset_id"`
		Name       string                                 `json:"name"`
		AbstractID string                                 `json:"abstract_id"`
		Config     *LEDInfectedArduinoConfigStripeConfig  `json:"config"`
		Palette    *LEDInfectedArduinoConfigStripePalette `json:"palette"`
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

		for _, p := range presets {
			if p.PresetID == preset.PresetID {
				fmt.Printf("invalid preset: preset ID %s: already used (%s)\n", preset.PresetID, m)
				continue
			}
		}

		presets = append(presets, preset)
	}
	return presets
}

func UpdatePreset(preset *LEDInfectedPreset) error {
	if preset == nil {
		return fmt.Errorf("nil preset given")
	}
	if preset.PresetID == "" {
		return fmt.Errorf("no preset id given")
	}
	if preset.Config == nil && preset.Palette == nil {
		return fmt.Errorf("given preset %s contains no configuration", preset.Name)
	}

	fileName := preset.PresetID + ".json"
	jsonPreset, err := json.Marshal(preset)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(presetDir, 0755); err != nil {
		return err
	}
	return ioutil.WriteFile(presetDir+"/"+fileName, jsonPreset, 0644)
}
