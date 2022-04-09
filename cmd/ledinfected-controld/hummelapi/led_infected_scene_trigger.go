package hummelapi

type (
	LEDInfectedSceneTrigger struct {
		ActTriggerID *string `json:"act_trigger_id"`
		TimeoutS     *uint32 `json:"timeout_s"`
	}
)
