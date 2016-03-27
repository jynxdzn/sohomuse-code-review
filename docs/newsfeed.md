# Newsfeed

## Overview

There's a division drawn between the stored "news items", and the public accessible "user feed". The latter is a compiled, redistributed, and potentially cached representation of the former.

## Public Interface

### GET /api/v1/news

> Returns newsfeed in JSON format, with translations into user locale
> Idea: The frontend should do a pass, so we can supplant items, e.g. actor = {12345, 'Consuelo'} with <a href="user/12345">Consuelo</a>.

> [{
>	'time': (unix format) -> translate to a time on client side (e.g. moment.js)
>	'action': (as below)
>	'actor': {id: 12345, name: 'Consuelo'}
>}]

### GET /api/v1/news/historic [Proposed - not yet implemented]

> For scanning through status updates

> date_from (Unix time)
> date_until (Unix time)


## Code Interface

News.VIEW_BLOCK_LENGTH (default: 10)

### function News.Get(USER_ID, cb)

Returns a datablock of news items, to be fed to the formatter.


### function News.GetHistoric(USER_ID, until_date = null) [Proposed]

> If the user is scrolling to older newsfeed items, we can send in an until_date to get the next batch of NEWSFEED_VIEW_BLOCK_LENGTH items.
> We may wish to cache this block for our user?


### function News.Uncache(USER_ID)

> When a user makes a new contact, we'll want to rebuild their newsfeed to include this contact's information
> This call will drop the redis queue and any associated cached data.


### function News.UncacheAll()

> If we need to rebuild everyone's data - This could cause a massive activity spike, so probably not a good idea at scale.


### function NewsItem.Add(ACTION, ACTOR_ID, ACTION_DATA, cb)

> ACTION_DATA must suit the formats specified above, and an actor


### function NewsItem.AddComment(parent_id, actor_id, action_data, cb)

### function NewsItem.Like(id, actor_id, cb)

### function NewsItem.Unlike(id, actor_id, cb)

### function NewsItem.CommentLike(id, actor_id, cb)

### function NewsItem.CommentUnlike(id, actor_id, cb)


## Newsfeed items

Stored in MongoDb:newsitems

The newsfeed items from the database could be run through a data=>language converter (maybe better on view)
A future bonus is that this facilitates multiple languages, but more fundamentally, it helps us separate 'view' and 'model'.

Mongo will store newsfeed items in the following format:

(MongoId): {
	action: ['status'|'post_photos'|...]
	time: (MongoDate)
	data: /ACTION_DATA/
	comments: [(MongoId) array of comments]
	likes: [(MongoId) array of likes]
}


### 'action'

/ACTION_DATA/ is dependent on 'action', and will be:

#### action: 'status'

actor: (MongoId)
text: (String/capped length)

#### action: 'post_photos'

actor: (MongoId)
photos: []		?? Or a link to a photo upload group?

#### action: 'post_videos'

actor: (MongoId)
videos: []		?? Or a link to a video upload group?

#### action: 'project_completed'

actor: (MongoId)
project: (MongoId)

#### action: 'project_launched'

actor: (MongoId)
project: (MongoId)

#### action: 'project_callout'

actor: (MongoId)
project: (MongoId)

#### action: 'locate'

actor: (MongoId)
location_name: (string)
geo: {lng: (decimal/10:8), lat: (decimal/11:8)}

#### action: 'connect'

actors: [(MongoId), (MongoId)]


## Comments

Stored in MongoDb:comments

(MongoId): {
	actor: (MongoId)
	time: (MongoDate)
	data: {
		text: (String/capped length)
	}
}


## Likes

Stored in MongoDb:likes

(MongoId): {
	actor: (MongoId)
	time: (MongoDate)
}


## Individual newsfeeds

Each user will have their newsfeed built as a Redis capped queue.

When someone makes a newsfeed update, this will be inserted into the global newsfeed data, and ids added to all their contacts queues.
This may seem bulky, but it's tractable, and - at scale - suggested as the best plan.

There may additionally be in-memory cacheing of the Mongo data, or these Redis queues, to cap database access?


## References

Taking advice from those who have done it before:

[http://www.quora.com/Is-Redis-or-MongoDB-better-for-a-news-feed](Quora)
