package hummelapi

import "fmt"

type (
	HummelCommandResponse struct {
		cmdType uint8
		cmdCode uint8
		cmdID   uint8
		data    []byte
	}
)

var nextCmdID = uint8(0)

func newHummelCommand(cmdType byte, cmdCode byte, data []byte) *HummelCommandResponse {
	nextCmdID++
	return &HummelCommandResponse{
		cmdType: cmdType,
		cmdCode: cmdCode,
		cmdID:   nextCmdID,
		data:    data,
	}
}

func castHummelCommand(buf []byte, index int) (*HummelCommandResponse, error) {
	lenIndex := index
	baseCmdIndex := index + 1
	// the first thing we read is the length
	lenMsgData := buf[lenIndex]
	if lenIndex+2+int(lenMsgData) > len(buf) {
		// we need to read more data, we are currently screwed
		return nil, fmt.Errorf("could not be read message in one chunk, this is currently not supported")
	}
	if lenMsgData > 100 {
		return nil, fmt.Errorf("message data length looks strange, %d", lenMsgData)
	}

	var data []byte
	if lenMsgData > 0 {
		data = buf[(baseCmdIndex + 2):(baseCmdIndex + 2 + int(lenMsgData))]
	}
	return &HummelCommandResponse{
		cmdType: buf[baseCmdIndex+1] & hummelCommandMaskType,
		cmdCode: buf[baseCmdIndex+1] & hummelCommandMaskCode,
		cmdID:   buf[baseCmdIndex],
		data:    data,
	}, nil
}

func (o *HummelCommandResponse) IsEqual(other *HummelCommandResponse) bool {
	if o.cmdID != other.cmdID {
		return false
	}

	if o.cmdCode != other.cmdCode {
		return false
	}

	if o.cmdType != other.cmdType {
		return false
	}
	return true
}

func (o *HummelCommandResponse) GetCmdBytes() []byte {
	cmdBytes := []byte{hummelCommandProtocolIdSending, hummelCommandProtocolIdSending}

	lenData := uint8(len(o.data))

	cmdBytes = append(cmdBytes, lenData, o.cmdID, o.cmdType|o.cmdCode)
	if len(o.data) > 0 {
		cmdBytes = append(cmdBytes, o.data...)
	}
	return cmdBytes
}
