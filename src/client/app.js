import angular from 'angular/angular';
import 'angular-route/angular-route';
import 'angular-aria/angular-aria';
import 'angular-animate/angular-animate';
import 'angular-material/angular-material';


function config($routeProvider, $mdThemingProvider, $mdIconProvider) {
  $routeProvider
    .when('/', {templateUrl: '/static/partials/home.ng'})
    .otherwise({redirectTo: '/'});

  $mdThemingProvider.theme('default')
    .primaryPalette("red")
    .accentPalette('green')
    .warnPalette('blue');

  $mdIconProvider.fontSet('fa', 'fontawesome');
}

config.$inject = ['$routeProvider', '$mdThemingProvider', '$mdIconProvider'];


class MainController {
  message: string;

  constructor() {
    this.message = "Quick Starter App with ES6";
  }
}

angular
  .module('main_app', ['ngRoute', 'ngMaterial', 'ngAnimate'])
  .config(config)
  .controller('MainController', MainController);