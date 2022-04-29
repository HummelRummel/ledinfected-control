#!/bin/bash

GOOS=linux GOARCH=arm go build ./cmd/ledinfected-controld

IP=192.168.1.42
#IP=10.0.0.1

scp -o StrictHostKeyChecking=no -r ledinfected-controld root@${IP}:/ledinfected
#scp -o StrictHostKeyChecking=no -r example-configs/ html/ root@${IP}:/ledinfected
#scp -o StrictHostKeyChecking=no -r ledinfected-controld acts configs assets/ example-configs/ html/ presets/ root@${IP}:/ledinfected
