(function () {
    'use strict';

    var controllerId = 'encounterDetail';

    function encounterDetail($filter, $location, $mdBottomSheet, $mdDialog, $routeParams, $scope, $window, addressService,
                             attachmentService, common, demographicsService, fhirServers, humanNameService, identifierService,
                             organizationService, encounterService, encounterValueSets, practitionerService, communicationService,
                             careProviderService, observationService, config) {

        /*jshint validthis:true */
        var vm = this;

        var logError = common.logger.getLogFn(controllerId, 'error');
        var logInfo = common.logger.getLogFn(controllerId, 'info');
        var logWarning = common.logger.getLogFn(controllerId, 'warning');
        var $q = common.$q;
        var noToast = false;

        function _activate() {
            common.activateController([_getActiveServer()], controllerId)
                .then(function () {
                    _getPatientContext();
                    _getRequestedEncounter();
                });
        }

        function deleteEncounter(encounter, event) {
            function executeDelete() {
                if (encounter && encounter.resourceId && encounter.hashKey) {
                    encounterService.deleteCachedEncounter(encounter.hashKey, encounter.resourceId)
                        .then(function () {
                            logInfo("Deleted encounter " + encounter.fullName);
                            $location.path('/encounter');
                        },
                        function (error) {
                            logError(common.unexpectedOutcome(error));
                        }
                    );
                }
            }

            var confirm = $mdDialog.confirm()
                .title('Delete ' + encounter.fullName + '?')
                .ariaLabel('delete encounter')
                .ok('Yes')
                .cancel('No')
                .targetEvent(event);
            $mdDialog.show(confirm).then(executeDelete,
                function () {
                    logInfo('You decided to keep ' + encounter.fullName);
                });
        }

        function edit(encounter) {
            if (encounter && encounter.hashKey) {
                $location.path('/encounter/' + encounter.hashKey);
            }
        }

        function _getActiveServer() {
            fhirServers.getActiveServer()
                .then(function (server) {
                    vm.activeServer = server;
                });
        }

        function getOrganizationReference(input) {
            var deferred = $q.defer();
            organizationService.getOrganizationReference(vm.activeServer.baseUrl, input)
                .then(function (data) {
                    deferred.resolve(data);
                }, function (error) {
                    logError(common.unexpectedOutcome(error), null, noToast);
                    deferred.reject();
                });
            return deferred.promise;
        }

        function _getEverything() {
            encounterService.getEncounterEverything(vm.encounter.resourceId)
                .then(function (data) {
                    vm.summary = data.summary;
                    vm.history = data.history;
                    logInfo("Retrieved everything for encounter at " + vm.encounter.resourceId, null, noToast);
                }, function (error) {
                    logError(common.unexpectedOutcome(error), null, noToast);
                    _getObservations();  //TODO: fallback for those servers that haven't implemented $everything operation
                });
        }

        function _getObservations() {
            observationService.getObservations(vm.activeServer.baseUrl, null, vm.encounter.id)
                .then(function (data) {
                    vm.summary = data.entry;
                    logInfo("Retrieved observations for encounter " + vm.encounter.fullName, null, noToast);
                }, function (error) {
                    vm.isBusy = false;
                    logError(common.unexpectedOutcome(error), null, noToast);
                });
        }

        function _getRequestedEncounter() {
            function initializeData(data) {
                vm.encounter = data;
                //Set encounter data

                if (vm.lookupKey !== "new") {
                    $window.localStorage.encounter = JSON.stringify(vm.encounter);
                }
            }

            vm.encounter = undefined;
            vm.lookupKey = $routeParams.hashKey;


            if (vm.lookupKey === "current") {
                // Re-hydrate existing encounter
                if (angular.isUndefined($window.localStorage.encounter) || ($window.localStorage.encounter === null)) {
                    if (angular.isUndefined($routeParams.id)) {
                        $location.path('/encounter');
                    }
                } else {
                    vm.encounter = JSON.parse($window.localStorage.encounter);
                    vm.encounter.hashKey = "current";
                    initializeData(vm.encounter);
                }
            } else if (angular.isDefined($routeParams.id)) {
                // Retrieve encounter from remote server
                vm.isBusy = true;
                var resourceId = vm.activeServer.baseUrl + '/Encounter/' + $routeParams.id;
                encounterService.getEncounter(resourceId)
                    .then(function (resource) {
                        initializeData(resource.data);
                        if (vm.encounter) {
                            _getEverything(resourceId);
                        }
                    }, function (error) {
                        logError(common.unexpectedOutcome(error));
                    }).then(function () {
                        vm.isBusy = false;
                    });
            } else if (vm.lookupKey === 'new') {
                // Start new encounter
                var data = encounterService.initializeNewEncounter();
                initializeData(data);
                vm.isEditing = false;
            } else {
                logError("Unable to resolve encounter lookup");
            }
        }

        function save() {
            function processResult(results) {
                var resourceVersionId = results.headers.location || results.headers["content-location"];
                if (angular.isUndefined(resourceVersionId)) {
                    logWarning("Encounter saved, but location is unavailable. CORS not implemented correctly at remote host.");
                } else {
                    logInfo("Encounter saved at " + resourceVersionId);
                    vm.encounter.resourceVersionId = resourceVersionId;
                    vm.encounter.resourceId = common.setResourceId(vm.encounter.resourceId, resourceVersionId);
                }
                vm.encounter.fullName = humanNameService.getFullName();
                vm.isEditing = true;
                $window.localStorage.encounter = JSON.stringify(vm.encounter);
                vm.isBusy = false;
            }

            var encounter = encounterService.initializeNewEncounter();
            if (humanNameService.getAll().length === 0) {
                logError("Encounter must have at least one name.");
                return;
            }
            encounter.name = humanNameService.mapFromViewModel();
            encounter.photo = attachmentService.getAll();

            encounter.birthDate = $filter('dateString')(demographicsService.getBirthDate());
            encounter.gender = demographicsService.getGender();
            encounter.maritalStatus = demographicsService.getMaritalStatus();
            encounter.multipleBirthBoolean = demographicsService.getMultipleBirth();
            encounter.multipleBirthInteger = demographicsService.getBirthOrder();
            encounter.deceasedBoolean = demographicsService.getDeceased();
            encounter.deceasedDateTime = demographicsService.getDeceasedDate();
            encounter.race = demographicsService.getRace();
            encounter.religion = demographicsService.getReligion();
            encounter.ethnicity = demographicsService.getEthnicity();
            encounter.mothersMaidenName = demographicsService.getMothersMaidenName();
            encounter.birthPlace = demographicsService.getBirthPlace();

            encounter.address = addressService.mapFromViewModel();
            encounter.telecom = contactPointService.mapFromViewModel();
            encounter.identifier = identifierService.getAll();
            encounter.managingOrganization = vm.encounter.managingOrganization;
            encounter.communication = communicationService.getAll();
            encounter.careProvider = careProviderService.getAll();

            encounter.active = vm.encounter.active;
            vm.isBusy = true;
            if (vm.isEditing) {
                encounter.id = vm.encounter.id;
                encounterService.updateEncounter(vm.encounter.resourceId, encounter)
                    .then(processResult,
                    function (error) {
                        logError(common.unexpectedOutcome(error));
                        vm.isBusy = false;
                    });
            } else {
                encounterService.addEncounter(encounter)
                    .then(processResult,
                    function (error) {
                        logError(common.unexpectedOutcome(error));
                        vm.isBusy = false;
                    });
            }
        }

        function _getPatientContext() {
            if (angular.isDefined($window.localStorage.patient)) {
                vm.patient = JSON.parse($window.localStorage.patient);
            } else {
                logError("You must first select a patient before initiating a consultation", error);
                $location.path('/patient');
            }
        }

        function showAuditData($index, $event) {
            showRawData(vm.history[$index], $event);
        }

        function showClinicalData($index, $event) {
            showRawData(vm.summary[$index], $event);
        }

        function showRawData(item, event) {
            $mdDialog.show({
                optionsOrPresent: {disableParentScroll: false},
                templateUrl: 'templates/rawData-dialog.html',
                controller: 'rawDataController',
                locals: {
                    data: item
                },
                targetEvent: event
            });
        }

        function canDelete() {
            return !vm.isEditing;
        }

        $scope.$on('server.changed',
            function (event, data) {
                vm.activeServer = data.activeServer;
                logInfo("Remote server changed to " + vm.activeServer.name);
            }
        );

        function canSave() {
            return !vm.isSaving;
        }

        Object.defineProperty(vm, 'canSave', {
            get: canSave
        });

        Object.defineProperty(vm, 'canDelete', {
            get: canDelete
        });

        function actions($event) {
            $mdBottomSheet.show({
                parent: angular.element(document.getElementById('content')),
                templateUrl: './templates/resourceSheet.html',
                controller: ['$mdBottomSheet', ResourceSheetController],
                controllerAs: "vm",
                bindToController: true,
                targetEvent: $event
            }).then(function (clickedItem) {
                switch (clickedItem.index) {
                    case 0:
                        $location.path('/encounter/detailed-search');
                        break;
                    case 1:
                        $location.path('/encounter/edit/current');
                        break;
                    case 2:
                        $location.path('/encounter/edit/new');
                        break;
                    case 3:
                        deleteEncounter(vm.encounter);
                        break;
                }
            });
            function ResourceSheetController($mdBottomSheet) {
                if (vm.isEditing) {
                    this.items = [
                        {name: 'Find another encounter', icon: 'search', index: 0},
                        {name: 'Edit encounter', icon: 'edit', index: 1},
                        {name: 'Add new encounter', icon: 'encounter', index: 2}
                    ];
                } else {
                    this.items = [
                        {name: 'Find another encounter', icon: 'search', index: 0},
                    ];
                }
                this.title = 'Encounter options';
                this.performAction = function (action) {
                    $mdBottomSheet.hide(action);
                };
            }
        }

        vm.actions = actions;
        vm.activeServer = null;
        vm.delete = deleteEncounter;
        vm.dataEvents = [];
        vm.errors = [];
        vm.history = [];
        vm.isBusy = false;
        vm.summary = [];
        vm.edit = edit;
        vm.getOrganizationReference = getOrganizationReference;
        vm.lookupKey = undefined;
        vm.isBusy = false;
        vm.isSaving = false;
        vm.isEditing = true;
        vm.encounter = undefined;
        vm.patient = undefined;
        vm.practitionerSearchText = '';
        vm.save = save;
        vm.selectedPractitioner = null;
        vm.showAuditData = showAuditData;
        vm.showClinicalData = showClinicalData;

        _activate();
    }

    angular.module('FHIRCloud').controller(controllerId,
        ['$filter', '$location', '$mdBottomSheet', '$mdDialog', '$routeParams', '$scope', '$window',
            'addressService', 'attachmentService', 'common', 'demographicsService', 'fhirServers',
            'humanNameService', 'identifierService', 'organizationService', 'encounterService', 'encounterValueSets',
            'practitionerService', 'communicationService', 'careProviderService', 'observationService', 'config', encounterDetail]);
})();