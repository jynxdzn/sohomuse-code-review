define(function (require) {

  var jquery = require('jquery'),
    backbone = require('backbone'),
    marionette = require('marionette'),
    vent = require('vent'),
    cpaginate = require('cpaginate'),
    models = require('./../models/models'),
    tmpl = require('text!./ConnectionsView.html'),
    styles = require('css!./style');

  var UserView = marionette.ItemView.extend({

    tagName: 'a',
    className: 'mini-connections-user bs-tooltip',

    attributes: function () {
      var title = this.model.get('firstName') + ' ' + this.model.get('lastName');
      if (this.model.get('notes')) {
        title = title + ': ' + this.model.get('notes');
      }

      return {
        href: "#user/" + encodeURIComponent(this.model.get('username')),
        title: title
      };
    },

    template: function (model) {
      return _.template('<img src="/api/v1/users/username/<%= encodeURIComponent(username) %>/avatar?width=45&amp;height=45" width="45" height="45">', model);
    }

  });

  var UsersView = marionette.CollectionView.extend({
    tagName: 'div',
    className: 'mini-connections-list clearfix',
    itemView: UserView
  });

  var ConnectionsView = marionette.ItemView.extend({

    tagName: 'div',
    className: 'mini-connections',

    numPerPage: 0,
    width: 0,

    initialize: function () {

      //console.log("ConnectionsView username: " + this.options.username);

      var self = this;

      this.connections = new models.Contacts();
      this.connections.url = '/api/v1/users/username/' + encodeURIComponent(this.options.username) + '/connections';
      this.connections.fetch({
        success: function (res) {
          self.$el.find(".tab-connections .count").text(parseInt(res.length));
          $("#connections-all .mini-connections-list").cPaginate({
            numPerPage: self.numPerPage,
            itemSelector: '.mini-connections-user',
            pagerPrevClass: 'cpaginate-prev pull-left',
            pagerNextClass: 'cpaginate-next pull-right',
            pagerPrevHtml: '<img src="/img/sarr-left.png">',
            pagerNextHtml: '<img src="/img/sarr-right.png">'
          });
        }
      });

      this.mutual = new models.Contacts();
      this.mutual.url = '/api/v1/users/username/' + encodeURIComponent(this.options.username) + '/mutual';
      this.mutual.fetch({
        success: function (res) {
          self.$el.find(".tab-mutual .count").text(parseInt(res.length));
          self.$el.find("#connections-mutual .mini-connections-list").addClass("clearfix").cPaginate({
            numPerPage: self.numPerPage,
            itemSelector: '.mini-connections-user',
            pagerPrevClass: 'cpaginate-prev pull-left',
            pagerNextClass: 'cpaginate-next pull-right',
            pagerPrevHtml: '<img src="/img/sarr-left.png">',
            pagerNextHtml: '<img src="/img/sarr-right.png">'
          });
        }
      });

      this.endorsements = new models.Contacts();
      this.endorsements.url = '/api/v1/user-endorsements/username/' + encodeURIComponent(this.options.username);
      this.endorsements.fetch({
        success: function (res) {
          self.$el.find(".tab-endorsements .count").text(parseInt(res.length));
          self.$el.find("#connections-endorsements .mini-connections-list").addClass("clearfix").cPaginate({
            numPerPage: self.numPerPage,
            itemSelector: '.mini-connections-user',
            pagerPrevClass: 'cpaginate-prev pull-left',
            pagerNextClass: 'cpaginate-next pull-right',
            pagerPrevHtml: '<img src="/img/sarr-left.png">',
            pagerNextHtml: '<img src="/img/sarr-right.png">'
          });
        }
      });
    },

    onShow: function () {
      this.width = $(".pane-meta").width() - 60;
      this.numPerPage = Math.floor(this.width / 55);
    },

    onRender: function () {

      var self = this,
        connectionsView = null,
        mutualView = null,
        endorsementsView = null;

      // All connections
      connectionsView = new UsersView({
        collection: this.connections
      });
      this.$el.find('#connections-all .content').append(connectionsView.el);

      // Mutual connections
      mutualView = new UsersView({
        collection: this.mutual
      });
      this.$el.find('#connections-mutual .content').append(mutualView.el);

      // Endorsements
      endorsementsView = new UsersView({
        collection: this.endorsements
      });
      this.$el.find('#connections-endorsements .content').append(endorsementsView.el);


    },

    template: function (model) {
      return _.template(tmpl, model);
    },

    setCount: function (el, collection) {
      el.text(collection.length);
    }

  });

  return function (username) {

    var view = new ConnectionsView({
      username: username,
      model: new models.User({
        username: username
      })
    });

    return view;
  };

});