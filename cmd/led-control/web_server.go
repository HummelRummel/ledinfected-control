package main

import (
	"github.com/gin-gonic/gin"
	"sync"
)

type (
	webServer struct {
		engine *gin.Engine
	}
)

func newWebServer() (*webServer, error) {
	o := &webServer{
		engine: gin.Default(),
	}

	return o, nil
}

func (o *webServer) run() {
	wg := sync.WaitGroup{}

	o.registerEndpoints()

	wg.Add(1)
	go func() {
		defer wg.Done()
		o.engine.Run("localhost:8080")
	}()

	wg.Wait()
}

func (o *webServer) registerEndpoints() {
	o.engine.Static("/assets", "./assets")
	o.engine.StaticFile("/", "./html/index.html")
}