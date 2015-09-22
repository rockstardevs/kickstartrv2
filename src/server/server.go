// frontend http server
package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/golang/glog"
	"github.com/gorilla/mux"
)

var (
	// populated at build time.
	version     = "@@version"
	projectName = "@@project_name"

	// http server flags
	httpAddress  = flag.String("httpaddress", "", "ip address for the http server.")
	httpPort     = flag.Int("httpport", 8080, "port for the http server.")
	staticRoot   = flag.String("staticroot", "./static", "root dir for static resources.")
	templateRoot = flag.String("templateroot", "./templates", "root dir for templates.")
)

func IndexHandler(rw http.ResponseWriter, req *http.Request) {
	if req.RequestURI != "/" {
		http.NotFound(rw, req)
		return
	}
	http.ServeFile(rw, req, *templateRoot+"/index.html")
}

func main() {
	// Parse flags
	flag.Parse()
	glog.Infof("%s frontend v%v", projectName, version)

	// Routing
	router := mux.NewRouter()
	router.HandleFunc("/", IndexHandler)

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(*staticRoot))))
	http.Handle("/", router)
	glog.Info("initialized routing")

	// Start Http Server.
	addr := fmt.Sprintf("%s:%d", *httpAddress, *httpPort)
	glog.Infof("Listening on %s", addr)
	go http.ListenAndServe(addr, nil)

	// Handle SIGINT and SIGTERM.
	ch := make(chan os.Signal)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	glog.Info(<-ch)
}
