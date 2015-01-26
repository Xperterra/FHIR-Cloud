(function () {
    'use strict';

    var app = angular.module('FHIRStarter', [
        // Angular modules
        'ngAnimate',        // animations
        'ngMaterial',       // material design
        'ngRoute',         // routing,
        'ngSanitize',
        'ngMessages',
        'ngCookies',
        'common',
        'ui.bootstrap'
    ]);

    app.config(['$routeProvider', '$locationProvider',
        function ($routeProvider, $locationProvider) {
            $routeProvider.when('/conformance', {
                templateUrl: 'conformance/conformance.html'
            }).when('/extensionDefinition', {
                templateUrl: 'extensionDefinition/extensionDefinition-search.html'
            }).when('/extensionDefinition/view/:hashKey', {
                templateUrl: 'extensionDefinition/extensionDefinition-view.html'
            }).when('/extensionDefinition/edit/:hashKey', {
                templateUrl: 'extensionDefinition/extensionDefinition-edit.html'
            }).when('/operationDefinition', {
                templateUrl: 'operationDefinition/operationDefinition-search.html'
            }).when('/operationDefinition/view/:hashKey', {
                templateUrl: 'operationDefinition/operationDefinition-view.html'
            }).when('/operationDefinition/edit/:hashKey', {
                templateUrl: 'operationDefinition/operationDefinition-edit.html'
            }).when('/organization', {
                templateUrl: 'organization/organization-search.html'
            }).when('/organization/view/:hashKey', {
                templateUrl: 'organization/organization-view.html'
            }).when('/organization/edit/:hashKey', {
                templateUrl: 'organization/organization-edit.html'
            }).when('/patients/:orgId', {
                templateUrl: 'patient/patient-search.html'
            }).when('/patient', {
                templateUrl: 'patient/patient-search.html'
            }).when('/patient/view/:hashKey', {
                templateUrl: 'patient/patient-view.html'
            }).when('/patient/edit/:hashKey', {
                templateUrl: 'patient/patient-edit.html'
            }).when('/practitioner', {
                templateUrl: 'practitioner/practitioner-search.html'
            }).when('/person', {
                templateUrl: 'person/person-search.html'
            }).when('/person/view/:hashKey', {
                templateUrl: 'person/person-view.html'
            }).when('/person/edit/:hashKey', {
                templateUrl: 'person/person-edit.html'
            }).when('/profile', {
                templateUrl: 'profile/profile-search.html'
            }).when('/profile/view/:hashKey', {
                templateUrl: 'profile/profile-view.html'
            }).when('/profile/edit/:hashKey', {
                templateUrl: 'profile/profile-edit.html'
            }).when('/healthcareService', {
                templateUrl: 'templates/home.html'
            }).when('/valueSet', {
                templateUrl: 'valueSet/valueSet-search.html'
            }).when('/valueSet/view/:hashKey', {
                templateUrl: 'valueSet/valueSet-view.html'
            }).when('/valueSet/edit/:hashKey', {
                templateUrl: 'valueSet/valueSet-edit.html'
            }).otherwise({
                redirectTo: '/home'
            });
            //   $locationProvider.html5Mode({enabled: true, requireBase: false});
        }]);

    app.controller('HomeCtrl', function ($scope) {
        $scope.welcome_message = "Hello FHIR Starter user!";
    });

    app.controller('LeftCtrl', function ($scope, $timeout, $mdSidenav, $log) {
        $scope.close = function () {
            $mdSidenav('left').close();
            $log.debug("close LEFT is done");
        };
    });

    app.controller('AppCtrl', function ($scope, $timeout, $mdSidenav, $log) {
            $scope.toggleLeft = function () {
                $mdSidenav('left').toggle();
                $log.debug("toggle left is done");
            };
        }
    );

    app.controller('MainCtrl', function ($scope, $mdDialog, $filter, $location, $rootScope, $window, common, config) {
        /*jshint validthis:true */
        var vm = this;
        var events = config.events;
        $scope.isBusy = false;

        var _adminPages = [
            {name: 'Organization', href: 'organization'},
            {name: 'Patient', href: 'patient'},
            {name: 'Practitioner', href: 'practitioner'},
            {name: 'Person', href: 'person'},
            {name: 'Healthcare Service', href: 'healthcareService'}
        ];

        var _conformancePages = [
            {name: 'Conformance', href: 'conformance'},
            {name: 'Profile', href: 'profile'},
            {name: 'Extension Definition', href: 'extensionDefinition'},
            {name: 'Operation Definition', href: 'operationDefinition'},
            {name: 'Value Set', href: 'valueSet'}
        ];

        var _documentsPages = [
            {name: 'Composition', href: 'composition'},
            {name: 'Document Reference', href: 'documentReference'},
            {name: 'Document Manifest', href: 'documentManifest'}
        ];

        var _sections = [
            {name: 'Administration', id: 1, pages: _adminPages},
            {name: 'Conformance', id: 2, pages: _conformancePages},
            {name: 'Documents', id: 3, pages: _documentsPages}
        ];

        $scope.menu = {sections: _sections, selectedSection: undefined, selectedPage: undefined, selectedSubPage: undefined};

        $scope.isSectionSelected = function (section) {
            return section === $scope.menu.selectedSection;
        };

        $scope.pageSelected = function (page) {
            $scope.menu.selectedPage = page.name;
            $location.path('/' + page.href);
        };

        $scope.toggleSelectSection = function (section) {
            if (angular.isDefined($scope.menu.selectedSection) && ($scope.menu.selectedSection.id === section.id)) {
                $scope.menu.selectedSection = undefined;

            } else {
                $scope.menu.selectedSection = section;
            }
            $scope.menu.selectedPage = undefined;
            $scope.menu.selectedSubPage = undefined;
        };

        function toggleProgressBar(on) {
            $scope.isBusy = on;
        }

        $rootScope.$on('$routeChangeStart',
            function (event, next, current) {
                toggleProgressBar(true);
            }
        );

        $rootScope.$on('$routeChangeSuccess',
            function (event, current) {
                toggleProgressBar(false);
            }
        );

        $rootScope.$on(events.controllerActivateSuccess,
            function (data) {
                // Update ui if necessary
            }
        );

        $rootScope.$on(events.progressToggleEvent,
            function (data) {
                toggleProgressBar(data.show);
            }
        );
    });
})();
