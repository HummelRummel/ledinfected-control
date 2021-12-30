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
	baseCmdIndex := index + 2
	// the first thing we read is the length
	lenMsgData := uint16(buf[lenIndex]) + (uint16(buf[lenIndex+1]) << 8)
	if lenIndex+2+int(lenMsgData) > len(buf) {
		// we need to read more data, we are currently screwed
		return nil, fmt.Errorf("could not be read message in one chunk, this is currently not supported")
	}
	if lenMsgData > 1000 {
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

	lenData := uint16(len(o.data))
	lowerLenByte := uint8(lenData & 0xff)
	higherLenByte := uint8((lenData >> 8) & 0xff)
	cmdBytes = append(cmdBytes, lowerLenByte, higherLenByte, o.cmdID, o.cmdType|o.cmdCode)
	if len(o.data) > 0 {
		cmdBytes = append(cmdBytes, o.data...)
	}
	return cmdBytes
}
