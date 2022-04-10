package hummelapi

import (
	"encoding/json"
	"io/ioutil"
)

func writeJson(filePath string, jsonData interface{}) error {
	file, err := json.MarshalIndent(jsonData, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(filePath, file, 0644)
}
