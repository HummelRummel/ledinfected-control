package hummelapi

/*
    HummelCommand protocol
    ----------------------

	The controlling node sends commands, with the message structure defined below and the sending protocol ID
	The receiving node, replaces the sending protocol id the consuming protocol id and its response data and sends it back.


	Message Structure
    -----------------

 	Byte(s) | Value    | Description
  	--------|----------|---------------------------
  	  1+2   | ProtoId  | Sending or consuming protocol ID twice to start the message
      3+4   | LenData  | Length of the data of the message (including the cmd, the cmdId and optional data)
      5     | CmdId    | Running int to id the command response
      6     | Cmd      | Command for the client (Type | Cmd)
      7+    | Data     | Optional

*/

const (
	hummelCommandProtocolIdSending   = 0xbb
	hummelCommandProtocolIdConsuming = 0xbe

	hummelCommandMaskType = 0xf0
	hummelCommandMaskCode = 0x0f

	//////////////////////////////////////////////////
	// global commands
	//////////////////////////////////////////////////
	hummelCommandTypeGlobal = 0x90

	hummelCommandGlobalSync          = 0x01
	hummelCommandCodeGlobalGetConfig = 0x02
	hummelCommandCodeGlobalGetId     = 0x03
	hummelCommandCodeGlobalSetId     = 0x0f

	//////////////////////////////////////////////////
	// base commands
	//////////////////////////////////////////////////

	hummelCommandTypeRadial1 = 0x10
	hummelCommandTypeRadial2 = 0x20
	hummelCommandTypeRadial3 = 0x30
	hummelCommandTypeRadial4 = 0x40
	hummelCommandTypeCircle  = 0x50

	hummelCommandCodeMovementSpeed     = 0x01
	hummelCommandCodeMovementDirection = 0x02
	hummelCommandCodeBrightness        = 0x03
	hummelCommandCodePaletteCHSV       = 0x04
	hummelCommandCodeSave              = 0x0f

	//////////////////////////////////////////////////
	// setup commands
	//////////////////////////////////////////////////
	hummelCommandTypeSetupRadial1 = 0xa0
	hummelCommandTypeSetupRadial2 = 0xb0
	hummelCommandTypeSetupRadial3 = 0xc0
	hummelCommandTypeSetupRadial4 = 0xd0
	hummelCommandTypeSetupCircle  = 0xe0

	hummelCommandCodeSetupLedPin  = 0x0a
	hummelCommandCodeSetupNumLeds = 0x0b
	hummelCommandCodeSetupSave    = 0x0f
)
