package hummelapi

import "fmt"

/*
    LEDInfectedCommand protocol
    ----------------------

	The controlling node sends commands, with the message structure defined below and the sending protocol Index
	The receiving node, replaces the sending protocol arduinoID the consuming protocol arduinoID and its response data and sends it back.


	Message Structure
    -----------------

// OUTDATED comment
 	Byte(s) | Value    | Description
  	--------|----------|---------------------------
  	  1+2   | ProtoId  | Sending or consuming protocol Index twice to start the message
      3+4   | LenData  | Length of the data of the message (including the cmd, the cmdId and optional data)
      5     | CmdId    | Running int to arduinoID the command response
      6     | Cmd      | Command for the client (Type | Cmd)
      7+    | Data     | Optional

*/

const (

	//////////////////////////////////////////////////
	// command type field
	//////////////////////////////////////////////////
	ledInfectedCommandTypeGlobal = 0x80
	// the stripe types are calculated (ledInfectedCommandTypeIndex[i] = 1 < index)

	ledInfectedCommandCodeGlobalSync      = 0xcc
	ledInfectedCommandCodeGlobalGetSetup  = 0x0e
	ledInfectedCommandCodeGlobalSetSetup  = 0xe0
	ledInfectedCommandCodeGlobalGetBPM    = 0x0b
	ledInfectedCommandCodeGlobalSetBPM    = 0xb0
	ledInfectedCommandCodeGlobalSetupSave = 0xfe

	ledInfectedCommandCodeStripeGetConfig  = 0x01
	ledInfectedCommandCodeStripeSetConfig  = 0x10
	ledInfectedCommandCodeStripeGetPalette = 0x02
	ledInfectedCommandCodeStripeSetPalette = 0x20
	ledInfectedCommandCodeStripeGetSetup   = 0x0d
	ledInfectedCommandCodeStripeSetSetup   = 0xd0
	ledInfectedCommandCodeStripeSaveSetup  = 0xfd
	ledInfectedCommandCodeStripeSave       = 0xff

	ledInfectedResponseCodeSuccess         = 0xbb
	ledInfectedResponseCodeUnknownCmdCode  = 0x01
	ledInfectedResponseCodeInvalidDataLen  = 0x02
	ledInfectedResponseCodeInvalidCmdType  = 0x03
	ledInfectedResponseCodeInvalidStripe   = 0x04
	ledInfectedResponseCodeInvalidLen      = 0x05
	ledInfectedResponseCodeInvalidChecksum = 0x06
	ledInfectedResponseCodeInputTrigger    = 0xd1
	ledInfectedResponseCodeInputButton     = 0xd2
	ledInfectedResponseCodeError           = 0xff
)

func ledInfectedCommandTypeIndex(index uint8) uint8 {
	return 1 << index
}

type (
	LEDInfectedCommand struct {
		cmdType    uint8
		cmdCode    uint8
		cmdID      uint8
		cmdDataLen uint8
		cmdData    []byte
	}

	LEDInfectedResponse struct {
		rspCode    uint8
		rspCmdID   uint8
		rspDataLen uint8
		rspData    []byte
		checksum   uint16
	}
)

func (o *LEDInfectedResponse) getRspString() string {
	switch o.rspCode {
	case ledInfectedResponseCodeSuccess:
		return "SUCCESS"
	case ledInfectedResponseCodeUnknownCmdCode:
		return "UNKNOWN_CMD_CODE"
	case ledInfectedResponseCodeInvalidDataLen:
		return "INVALID_DATA_LENGTH"
	case ledInfectedResponseCodeInvalidCmdType:
		return "INVALID_CMD_TYPE"
	case ledInfectedResponseCodeInvalidStripe:
		return "INVALID_STRIPE"
	case ledInfectedResponseCodeInvalidLen:
		return "INVALID_LEN"
	case ledInfectedResponseCodeInvalidChecksum:
		return "INVALID_CHECKSUM"
	case ledInfectedResponseCodeInputTrigger:
		return "INPUT_TRIGGER"
	case ledInfectedResponseCodeInputButton:
		return "INPUT_BUTTON"
	case ledInfectedResponseCodeError:
		return "ERROR"
	}
	return "UNKNOWN_ERROR"
}

func (o *LEDInfectedResponse) String() string {
	if o == nil {
		return "nil"
	}
	return fmt.Sprintf("code:%s, id: %d, dlen: %d", o.getRspString(), o.rspCmdID, o.rspDataLen)
}

func (o *LEDInfectedResponse) Check() error {
	var checksum uint16
	checksum += uint16(o.rspCode)
	checksum += uint16(o.rspCmdID)
	checksum += uint16(o.rspDataLen)
	for _, d := range o.rspData {
		checksum += uint16(d)
	}
	if checksum != o.checksum {
		return fmt.Errorf("checksum failed: calculated: %x, received: %x", checksum, o.checksum)
	}
	return nil
}

var nextCmdID = uint8(0)

func newLEDInfectedCommand(cmdType byte, cmdCode byte, data []byte) (*LEDInfectedCommand, error) {
	nextCmdID++
	if len(data) > 58 {
		return nil, fmt.Errorf("only 64 len data is allowed, with 4 bytes header and 2 for the checksum, this leaves a max of 58 (%d)", len(data))
	}
	return &LEDInfectedCommand{
		cmdType:    cmdType,
		cmdCode:    cmdCode,
		cmdID:      nextCmdID,
		cmdDataLen: uint8(len(data)),
		cmdData:    data,
	}, nil
}

func castLEDInfectedResponse(buf []byte) (*LEDInfectedResponse, error) {
	if len(buf) < 5 {
		return nil, fmt.Errorf("package too small for a response (%d)", len(buf))
	}
	var data []byte
	if buf[2] > 0 {
		data = buf[3 : len(buf)-2]
	}

	if len(data) != int(buf[2]) {
		return nil, fmt.Errorf("unexpected data len")
	}
	r := &LEDInfectedResponse{
		rspCode:    buf[0],
		rspCmdID:   buf[1],
		rspDataLen: buf[2],
		rspData:    data,
		checksum:   uint16(0xff&buf[len(buf)-1]) + (uint16(0xff&buf[len(buf)-2]) << 8),
	}

	if err := r.Check(); err != nil {
		return nil, fmt.Errorf("response with invalid checksum received: %s", err)
	}
	return r, nil
}

func (o *LEDInfectedCommand) IsResponse(other *LEDInfectedResponse) bool {
	return o.cmdID == other.rspCmdID
}

func (o *LEDInfectedCommand) ToBytes() []byte {
	var cmdBytes []byte
	cmdBytes = append(cmdBytes, o.cmdType)
	cmdBytes = append(cmdBytes, o.cmdCode)
	cmdBytes = append(cmdBytes, o.cmdID)
	cmdBytes = append(cmdBytes, o.cmdDataLen)
	if o.cmdDataLen > 0 {
		cmdBytes = append(cmdBytes, o.cmdData...)
	}
	var checksum uint16
	for _, b := range cmdBytes {
		checksum += uint16(b)
	}
	cmdBytes = append(cmdBytes, uint8((checksum>>8)&0xff))
	cmdBytes = append(cmdBytes, uint8(checksum&0xff))
	return cmdBytes
}
