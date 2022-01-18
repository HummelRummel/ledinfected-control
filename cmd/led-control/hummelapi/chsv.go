package hummelapi

type (
	CHSV struct {
		ID uint8 `json:"arduinoID"`
		H  *uint8 `json:"h"`
		S  *uint8 `json:"s"`
		V  *uint8 `json:"v"`
	}
)
