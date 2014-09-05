angular.module("angular-growl").service("growlMessages", ['growl, $sce, $timeout', function (growl, $sce, $timeout) {
  "use strict";

  var messages;
  var onlyUnique;
  var referenceId;

  this.init = function(reference, limitMessages) {
    messages = [];
    this.limitMessages = limitMessages;
    onlyUnique = growl.onlyUnique();

    referenceId = reference || 0;

  };

  this.addMessage = function(message) {
    if (parseInt(referenceId, 10) === parseInt(message.referenceId, 10)) {
      $timeout(angular.bind(this, function() {
        var found;
        var msgText;

        if (onlyUnique) {
          angular.forEach(messages, function(msg) {
            msgText = $sce.getTrustedHtml(msg.text);
            if (message.text === msgText &&
                  message.severity === msg.severity &&
                    msg.title === msg.title) {
              found = true;
            }
          });

          if (found) {
            return;
          }
        }

        message.text = $sce.trustAsHtml(String(message.text));

        /**If message closes on timeout, add's promises array for
          timeouts to stop close. Also sets message.closeoutTimer to ttl / 1000
        **/
        if(message.ttl && message.ttl !== -1) {
          message.countdown = message.ttl / 1000;
          message.promises = [];
          message.close = false;
          message.countdownFunction = function() {
            if(message.countdown > 1){
              message.countdown--;
              message.promises.push($timeout(message.countdownFunction, 1000));
            } else {
              message.countdown--;
            }
          };
        }

        /** Limit the amount of messages in the container **/
        if (angular.isDefined(this.limitMessages)) {
          var diff = messages.length - (this.limitMessages - 1);
          if (diff > 0) {
            messages.splice(this.limitMessages - 1, diff);
          }
        }

        /** abillity to reverse order (newest first ) **/
        if (growl.reverseOrder()) {
          messages.unshift(message);
        } else {
          messages.push(message);
        }

        if(typeof(message.onopen) === 'function') {
          message.onopen();
        }

        if (message.ttl && message.ttl !== -1) {
          //adds message timeout to promises and starts messages countdown function.
          message.promises.push($timeout(angular.bind(this, function() {
            this.deleteMessage(message);
          }, message.ttl)));
          message.promises.push($timeout(message.countdownFunction, 1000));
        }
      }), true);
    }
  };

  this.deleteMessage = function(message) {
    var index = messages.indexOf(message);
    if (index > -1) {
      messages.splice(index, 1);
    }

    if(typeof(message.onclose) === 'function') {
      message.onclose();
    }
  };

  //Cancels all promises within message upon deleting message or stop deleting.
  this.stopTimeoutClose = function(message){
    angular.forEach(message.promises, function(promise){
      $timeout.cancel(promise);
    });
    if(message.close){
      this.deleteMessage(message);
    } else {
      message.close = true;
    }
  };
}]);
