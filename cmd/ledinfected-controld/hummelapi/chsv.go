package hummelapi

type (
	CHSV struct {
		Index uint8  `json:"index"`
		H     *uint8 `json:"h"`
		S     *uint8 `json:"s"`
		V     *uint8 `json:"v"`
	}
)
