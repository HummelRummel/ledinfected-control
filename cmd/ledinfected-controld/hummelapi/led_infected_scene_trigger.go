package hummelapi

type (
	LEDInfectedSceneTrigger struct {
		ActTriggerID *string `json:"act_trigger_id"`
		TimeoutS     *uint32 `json:"timeout_s"`
		TimeoutMaxS  *uint32 `json:"timeout_max_s"`
		RemainingS   *uint32 `json:"remaining_s"`
	}
)
