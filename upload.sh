#!/bin/bash

GOOS=linux GOARCH=arm go build ./cmd/ledinfected-controld

IP="${1}"
if [[ -z "${2}" ]]; then
    FILES="ledinfected-controld assets/ example-configs/ html/"
else
    FILES="${2}"
fi

scp -o StrictHostKeyChecking=no -r ${FILES} root@${IP}:/ledinfected
#scp -o StrictHostKeyChecking=no -r example-configs/ html/ root@${IP}:/ledinfected
#scp -o StrictHostKeyChecking=no -r ledinfected-controld acts configs assets/ example-configs/ html/ presets/ root@${IP}:/ledinfected
