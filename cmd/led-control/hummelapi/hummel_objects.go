package hummelapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type (
	KnownObjects struct {
		objs []*HummelObject
	}
	HummelObject struct {
		filePath      string
		ControlObject HummelControlObject
	}
)

func GetKnownObject() (*KnownObjects, error) {
	matches, err := filepath.Glob("./config/*.json")
	if err != nil {
		return nil, err
	}

	var objects []*HummelObject
	for _, m := range matches {
		buf, err := os.ReadFile(m)
		if err != nil {
			fmt.Printf("failed to read %s: %s", m, err)
			continue
		}
		var controlObject HummelControlObject
		err = json.Unmarshal(buf, &controlObject)
		if err != nil {
			fmt.Printf("failed to unmarshal %s: %s", m, err)
			continue
		}
		objects = append(objects, &HummelObject{
			filePath:      m,
			ControlObject: controlObject,
		})
	}
	return &KnownObjects{objs: objects}, nil
}

func (o *KnownObjects) UpdateObject(object *HummelObject) error {
	bytes, err := json.Marshal(object)
	if err != nil {
		return fmt.Errorf("failed to marshal %s: %s", object.filePath, err)
	}

	// Open a new file for writing only
	file, err := os.OpenFile(object.filePath, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0666)
	if err != nil {
		return fmt.Errorf("failed to open %s: %s", object.filePath, err)
	}
	defer file.Close()

	_, err = file.Write(bytes)
	if err != nil {
		return fmt.Errorf("failed to write %s: %s", object.filePath, err)
	}
	o.objs = append(o.objs, object)
	return nil
}

func (o *KnownObjects) GetObjects() []*HummelObject {
	return o.objs
}
