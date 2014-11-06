if (Meteor.isClient) {

  //Mizzao All User Connections
  this.UserConnections = new Meteor.Collection("user_status_sessions");
  //Sync Times Across Timezones for login dates
  relativeTime = function(timeAgo) {
    var ago, days, diff, time;
    diff = moment.utc(TimeSync.serverTime() - timeAgo);
    time = diff.format("H:mm:ss");
    days = +diff.format("DDD") - 1;
    ago = (days ? days + "d " : "") + time;
    return ago + " ago";
  };


  Template.register.events({
    'submit form': function(event, template){
        event.preventDefault();
        var nameVar = template.find('#register-name').value;
        var photoVar = template.find('#register-photo').value;
        var passwordVar = template.find('#register-password').value;
        Accounts.createUser({
            username: nameVar,
            password: passwordVar,
            profile: {
              avatur_url: photoVar,
              current_vote: '',
              vote_ready: false
            }
        });
    }
  });

  Template.login.events({
    'submit form': function(event, template){
        event.preventDefault();
        var nameVar = template.find('#login-name').value;
        var passwordVar = template.find('#login-password').value;
        Meteor.loginWithPassword(nameVar, passwordVar);
    }
  });

  Template.dashboard.events({
    'click .logout': function(event){
        event.preventDefault();
        Meteor.logout();
    },

    'keyup #current-vote': function(event, template){
        event.preventDefault();
        var theEvent = event;
        var key = theEvent.keyCode || theEvent.which;
        if(key == 13){
          return;
        }
        key = String.fromCharCode( key );
        var currValue = template.find('#current-vote').value;
        var regex = /[0-9]|\./;
        if( !regex.test(key) ) {
          newValue = currValue.substring(0, currValue.length - 1);
          template.find('#current-vote').value = newValue;
        }
        if(currValue.length > 1){
          newValue = currValue.substring(0,1);
          template.find('#current-vote').value = newValue;
        }
        var currVote = template.find('#current-vote').value;
        Meteor.users.update({_id: Meteor.userId()}, { $set:{"profile.current_vote":currVote}}, {multi: true}, function(){
          if (currVote != ''){
            Meteor.users.update({_id: Meteor.userId()}, { $set:{"profile.vote_ready":true}}, {multi: true});
          }else{
            Meteor.users.update({_id: Meteor.userId()}, { $set:{"profile.vote_ready":false}}, {multi: true});
          }
        });
    }
  });

  UI.registerHelper("userStatus", UserStatus);
  UI.registerHelper("localeTime", function(date) {
    return date != null ? date.toLocaleString() : void 0;
  });
  UI.registerHelper("relativeTime", relativeTime);

  Template.login.loggedIn = function() {
    return Meteor.userId();
  };
  
  Template.serverStatus.anonymous = function() {
    return UserConnections.find({
      userId: {
        $exists: false
      }
    });
  };

  Template.serverStatus.allVoted = function() {
    if (Meteor.users.find({
      "status.online":true, 
      "profile.current_vote":''
    }).count() == 0) {
      return {class:"public-vote visible"}
    } else {
      return {class:"public-vote"}
      }    
  };

  Template.serverStatus.users = function() {
    return Meteor.users.find();
  };
  Template.serverStatus.userClass = function() {
    var _ref;
    if ((_ref = this.status) != null ? _ref.idle : void 0) {
      return "warning";
    } else {
      return "success";
    }
  };
  Template.serverStatus.connections = function() {
    return UserConnections.find({
      userId: this._id
    });
  };

  Template.login.events = {
    "submit form": function(e, tmpl) {
      var input;
      e.preventDefault();
      input = tmpl.find("input[name=username]");
      input.blur();
      return Meteor.insecureUserLogin(input.value, function(err, res) {
        if (err) {
          return console.log(err);
        }
      });
    }
  };
  Deps.autorun(function(c) {
    try {
      UserStatus.startMonitor({
        threshold: 30000,
        idleOnBlur: true
      });
      return c.stop();
    } catch (_error) {}
  });

}

if (Meteor.isServer) {
  Houston.add_collection(Meteor.users);
  Houston.add_collection(Houston._admins);
  process.env.HTTP_FORWARDED_COUNT = 1;
  Meteor.publish(null, function() {
    return [
      Meteor.users.find({
        "status.online": true
      }, {
        fields: {
          status: 1,
          username: 1,
          'profile.avatur_url': 1,
          'profile.current_vote': 1,
          'profile.vote_ready': 1
        }
      }), UserStatus.connections.find()
    ];
  });
}
