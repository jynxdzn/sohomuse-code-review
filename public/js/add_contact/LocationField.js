define(function(require) {

    var jquery = require('jquery'),
        selectize = require('selectize');

    function renderItem(item, escape) {
        var label = '<strong>' + item.name + '</strong>';

        if (item.location && item.location.address) {
            label += ' - ' + item.location.address;
        }
        
        return '<div>' + label + '</div>';
    }

    function initSelectize($ele, latlng, data) {
        $ele.selectize({
            maxItems: 1,
            valueField: 'id',
            labelField: 'text',
            searchField: ['text'],
            options: data,
            render: {
                item: renderItem,
                option: renderItem
            },
            create: function(input) {
                if (latlng) {
                    return {
                        id: input + '|' + latlng.lat + ',' + latlng.lng,
                        name: input
                    };
                } else {
                    return {
                        id: input,
                        name: input
                    };
                }
            }
        });
    }

    function getData($ele, latlng) {

        if (latlng) {
            jquery.get('/api/v1/geo', { lat: latlng.lat, lng: latlng.lng }).success(function(data) {
                initSelectize($ele, latlng, data);
            });
        } else {
            initSelectize($ele, latlng, []);
        }
    }

    return function($ele) {
        if (navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(function(position) {
                var latlng = { lat: position.coords.latitude.toFixed(6), lng: position.coords.longitude.toFixed(6) };
                getData($ele, latlng);
            }, function() {
                var latlng = null;
                getData($ele, latlng);
            });
        }
    };

});