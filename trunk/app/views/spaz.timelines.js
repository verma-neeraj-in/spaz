var Spaz; if (!Spaz) Spaz = {};

if (!Spaz.Timelines) Spaz.Timelines = {};


/**
 * options used for makeClickable calls 
 */
var SPAZ_MAKECLICKABLE_OPTS = {
 	'autolink': {
 		'type'      :'both',
 		'extra_code':'',
 		'maxlen'    :25
 	},
 	'screenname': {
 		'tpl':'<span class="user-screen-name clickable" title="View user\'s profile" user-screen_name="#username#">@#username#</span>' // should contain macro '#username#'
 	},
 	'hashtag': {
 		'tpl':'<span class="hashtag clickable" title="Search for this hashtag" data-hashtag="#hashtag_enc#">##hashtag#</span>' // should contain macros '#hashtag#' and '#hashtag_enc#'
 	}
};

//'';




/**
 * The string prefix for a "not these" filter
 */
var NEGATION_TOKEN = "not:";

/**
 * The AppTimeline is defined here so we can inherit its prototype below 
 */
var AppTimeline = function() {};

/**
 * This is just a wrapper to start the SpazTimeline object contained within 
 */
AppTimeline.prototype.activate = function() {
	this.timeline.start();
};

/**
 * filter the timeline (hide or show entries) based on a string of terms
 * @param {string} terms 
 */
AppTimeline.prototype.filter = function(terms) {
	var entry_selector = this.timeline.timeline_container_selector+' div.timeline-entry';
	jQuery(entry_selector).removeClass('hidden');
		
	if (terms) {
		try {
			var negate = false;
			if (terms.substring(0, NEGATION_TOKEN.length).toLowerCase() === NEGATION_TOKEN) {
				negate = true;
				terms  = terms.slice(NEGATION_TOKEN.length);
			}
			var filter_re = new RegExp(sch.trim(terms), "i");
			jQuery(entry_selector).each(function(i) {
				if (negate) {
					if ( jQuery(this).text().search(filter_re) > -1 ) {
						jQuery(this).addClass('hidden');
					}
				} else {
					if ( jQuery(this).text().search(filter_re) === -1 ) {
						jQuery(this).addClass('hidden');
					}
				}
			});
		} catch(e) {
			sch.dump(e.name+":"+e.message);
		}
	}
	
};

AppTimeline.prototype.clear = function() {
	// Spaz.dump('clearing the current timeline');
	// var tl = Spaz.Timelines.getTimelineFromTab(Spaz.UI.selectedTab)
	// 
	// // reset the lastcheck b/c some timelines will use "since" parameters
	// section.lastcheck = 0;
	// Spaz.dump('set lastcheck to 0');
	// if (section.lastid) {
	// 	section.lastid = 0;
	// 	Spaz.dump('set lastid to 0');
	// }
	// if (section.lastid_dm) {
	// 	section.lastid_dm = 0;
	// 	Spaz.dump('set lastid_dm to 0');
	// }
	// 
	// var timelineid = var timelineid = this.timeline.timeline_container_selector;
	// $('#' + timelineid + ' .timeline-entry').remove();
	// Spaz.dump('cleared timeline #' + timelineid);
}


AppTimeline.prototype.markAsRead = function() {
	//     Spaz.dump('clearing the current timeline');
	// 
	//     var timelineid = this.timeline.timeline_container_selector;
	//     $('#' + timelineid + " div.timeline-entry:visible").each(function() {
	// Spaz.DB.markEntryAsRead(Spaz.UI.getStatusIdFromElement(this));
	//         Spaz.UI.markEntryAsRead(this);
	// 
	//     });
	// 
	//     $().trigger('UNREAD_COUNT_CHANGED');

};


// Spaz.uc.usernames = Spaz.Cache.getScreenNamesAsTags();


/**
 * Friends timeline def 
 */
var FriendsTimeline = function() {
	
	var thisFT = this;
	this.twit = new SpazTwit();
	
	/*
		set up the Friends timeline
	*/
	this.timeline  = new SpazTimeline({
		'timeline_container_selector' :'#timeline-friends',
		'entry_relative_time_selector':'.status-created-at',
		
		'success_event':'new_combined_timeline_data',
		'failure_event':'error_combined_timeline_data',
		'event_target' :document,
		
		'refresh_time':Spaz.Prefs.get('network-refreshinterval'),
		'max_items':300,

		'request_data': function() {
			sch.dump('REQUESTING DATA FOR FRIENDS TIMELINE =====================');
			sc.helpers.markAllAsRead('#timeline-friends div.timeline-entry');
			var username = Spaz.Prefs.getUser();
			var password = Spaz.Prefs.getPass();
			thisFT.twit.setCredentials(username, password);
			thisFT.twit.getCombinedTimeline();
			Spaz.UI.statusBar("Loading friends timeline");
			Spaz.UI.showLoading();
			
			sch.error('REQUEST_DATA');
		},
		'data_success': function(e, data) {
			
			sch.error('DATA_SUCCESS');
			
			data = data.reverse();
			var no_dupes = [];

			sch.dump(data);
			
			
			var sui = new SpazImageURL();
			
			for (var i=0; i < data.length; i++) {
				sch.dump(i);
				/*
					only add if it doesn't already exist
				*/
				if (jQuery('#timeline-friends div.timeline-entry[data-status-id='+data[i].id+']').length<1) {
					
					
					data[i].SC_thumbnail_urls = sui.getThumbsForUrls(data[i].text);
					
					data[i].text = sc.helpers.makeClickable(data[i].text, SPAZ_MAKECLICKABLE_OPTS);
					no_dupes.push(data[i]);
					
					/*
						Save to DB via JazzRecord
					*/
					TweetModel.saveTweet(data[i]);
					
				}
				
			};
			
			

			/*
				Record old scroll position
			*/
			var oldFirst  = jQuery('#timeline-friends div.timeline-entry:first');
			var $timeline = jQuery('#timeline-friends');
			var offset_before = oldFirst.offset().top;
			

			/*
				Add new items
			*/
			thisFT.timeline.addItems(no_dupes);


			/*
				set new scroll position
			*/
			var offset_after = oldFirst.offset().top;
			var offset_diff = Math.abs(offset_before - offset_after);
			if ($timeline.parent().scrollTop() > 0) {
				$timeline.parent().scrollTop( $timeline.parent().scrollTop() + offset_diff );
			}

			/*
			 reapply filtering
			*/
			$('#filter-friends').trigger('keyup');
			
			sc.helpers.updateRelativeTimes('#timeline-friends a.status-created-at', 'data-created-at');
			jQuery('#timeline-friends div.timeline-entry').removeClass('even').removeClass('odd');
			jQuery('#timeline-friends div.timeline-entry:even').addClass('even');
			jQuery('#timeline-friends div.timeline-entry:odd').addClass('odd');

			Spaz.UI.hideLoading();
			Spaz.UI.statusBar("Ready");
			
		},
		'data_failure': function(e, error_obj) {
			sch.error('DATA_FAILURE');
			var err_msg = "There was an error retrieving your timeline";
			Spaz.UI.statusBar(err_msg);

			/*
				Update relative dates
			*/
			sc.helpers.updateRelativeTimes('#timeline-friends a.status-created-at', 'data-created-at');
			Spaz.UI.hideLoading();
		},
		'renderer': function(obj) {
			if (obj.SC_is_dm) {
				return Spaz.Tpl.parse('timeline_entry_dm', obj);
			} else {
				return Spaz.Tpl.parse('timeline_entry', obj);
			}
			
			
		}
	});
};

FriendsTimeline.prototype = new AppTimeline();

FriendsTimeline.prototype.reset = function() {
	
}





/**
 * Public timeline def 
 */
var PublicTimeline = function(args) {
	
	var thisPT = this;
	
	this.twit = new SpazTwit();

	
	/*
		set up the public timeline
	*/
	this.timeline  = new SpazTimeline({
		'timeline_container_selector' :'#timeline-public',
		'entry_relative_time_selector':'.status-created-at',
		
		'success_event':'new_public_timeline_data',
		'failure_event':'error_public_timeline_data',
		'event_target' :document,
		
		'refresh_time':1000*60*30, // 30 minutes
		'max_items':100,

		'request_data': function() {
			sc.helpers.markAllAsRead('#timeline-public div.timeline-entry');
			thisPT.twit.getPublicTimeline();
			Spaz.UI.statusBar("Loading public timeline");
			Spaz.UI.showLoading();
		},
		'data_success': function(e, data) {
			data = data.reverse();
			var no_dupes = [];
			
			var sui = new SpazImageURL();
			
			for (var i=0; i < data.length; i++) {
				
				/*
					only add if it doesn't already exist
				*/
				if (jQuery('#timeline-public div.timeline-entry[data-status-id='+data[i].id+']').length<1) {
					
					
					data[i].SC_thumbnail_urls = sui.getThumbsForUrls(data[i].text);
					
					data[i].text = sc.helpers.makeClickable(data[i].text, SPAZ_MAKECLICKABLE_OPTS);
					no_dupes.push(data[i]);
					/*
						Save to DB via JazzRecord
					*/
					TweetModel.saveTweet(data[i]);
				}
				
			};
			
			thisPT.timeline.addItems(no_dupes);

			/*
			 reapply filtering
			*/
			$('#filter-public').trigger('keyup');


			sc.helpers.markAllAsRead('#timeline-public div.timeline-entry'); // public are never "new"
			sc.helpers.updateRelativeTimes('#timeline-public a.status-created-at', 'data-created-at');
			jQuery('#timeline-public div.timeline-entry').removeClass('even').removeClass('odd');
			jQuery('#timeline-public div.timeline-entry:even').addClass('even');
			jQuery('#timeline-public div.timeline-entry:odd').addClass('odd');

			Spaz.UI.hideLoading();
			Spaz.UI.statusBar("Ready");
			
		},
		'data_failure': function(e, error_obj) {
			var err_msg = "There was an error retrieving the public timeline";
			Spaz.UI.statusBar(err_msg);

			/*
				Update relative dates
			*/
			sc.helpers.updateRelativeTimes('#timeline-public a.status-created-at', 'data-created-at');
			Spaz.UI.hideLoading();
		},
		'renderer': function(obj) {
			return Spaz.Tpl.parse('timeline_entry', obj);
			
		}
	});
	

	
	
};

PublicTimeline.prototype = new AppTimeline();


/**
 * User timeline def 
 */
var UserTimeline = function(args) {
	
	var thisUT = this;
	
	this.twit = new SpazTwit();

	
	/*
		set up the user timeline
	*/
	this.timeline  = new SpazTimeline({
		'timeline_container_selector' :'#timeline-user',
		'entry_relative_time_selector':'.status-created-at',
		
		'success_event':'new_user_timeline_data',
		'failure_event':'error_user_timeline_data',
		'event_target' :document,
		
		'refresh_time':1000*60*30, // 30 minutes
		'max_items':100,

		'request_data': function() {
			sc.helpers.markAllAsRead('#timeline-user div.timeline-entry');
			var username = Spaz.Prefs.getUser();
			var password = Spaz.Prefs.getPass();
			thisUT.twit.setCredentials(username, password);
			thisUT.twit.getUserTimeline(username);
			Spaz.UI.statusBar("Loading user timeline");
			Spaz.UI.showLoading();
		},
		'data_success': function(e, data) {
			data = data.reverse();
			var no_dupes = [];
			
			var sui = new SpazImageURL();
			
			for (var i=0; i < data.length; i++) {
				
				/*
					only add if it doesn't already exist
				*/
				if (jQuery('#timeline-user div.timeline-entry[data-status-id='+data[i].id+']').length<1) {
					
					data[i].SC_thumbnail_urls = sui.getThumbsForUrls(data[i].text);
					
					data[i].text = sc.helpers.makeClickable(data[i].text, SPAZ_MAKECLICKABLE_OPTS);
					no_dupes.push(data[i]);
					/*
						Save to DB via JazzRecord
					*/
					TweetModel.saveTweet(data[i]);
				}
				
			};
			
			thisUT.timeline.addItems(no_dupes);

			/*
			 reapply filtering
			*/
			$('#filter-user').trigger('keyup');


			sc.helpers.markAllAsRead('#timeline-user div.timeline-entry'); // user is never "new"
			sc.helpers.updateRelativeTimes('#timeline-user a.status-created-at', 'data-created-at');
			jQuery('#timeline-user div.timeline-entry').removeClass('even').removeClass('odd');
			jQuery('#timeline-user div.timeline-entry:even').addClass('even');
			jQuery('#timeline-user div.timeline-entry:odd').addClass('odd');

			Spaz.UI.hideLoading();
			Spaz.UI.statusBar("Ready");
			
		},
		'data_failure': function(e, error_obj) {
			var err_msg = "There was an error retrieving the user timeline";
			Spaz.UI.statusBar(err_msg);

			/*
				Update relative dates
			*/
			sc.helpers.updateRelativeTimes('#timeline-user a.status-created-at', 'data-created-at');
			Spaz.UI.hideLoading();
		},
		'renderer': function(obj) {
			return Spaz.Tpl.parse('timeline_entry', obj);
			
		}
	});
	
	
	
};

UserTimeline.prototype = new AppTimeline();


/**
 * Search timeline def 
 */
var SearchTimeline = function(args) {
	
	var thisST = this;
	
	this.query = null;
	this.lastquery = null;
	
	this.twit = new SpazTwit();
	
	/*
		set up the public timeline
	*/
	this.timeline  = new SpazTimeline({
		'timeline_container_selector' :'#timeline-search',
		'entry_relative_time_selector':'.status-created-at',
		
		'success_event':'new_search_timeline_data',
		'failure_event':'error_search_timeline_data',
		
		'event_target' :document,
		
		
		'refresh_time':1000*60*15, // 15 minutes
		'max_items':100,

		'request_data': function() {
			if (jQuery('#search-for').val().length > 0) {
				thisST.query = jQuery('#search-for').val();
				
				if (!thisST.lastquery) {
					thisST.lastquery = thisST.query;
				} else if (thisST.lastquery != thisST.query) {
					jQuery('#timeline-search .timeline-entry').remove();
				};
				
				// alert(thisST.lastquery+"\n"+thisST.query);
				
				// clear the existing results if this is a new query
				sc.helpers.markAllAsRead('#timeline-search div.timeline-entry');
				
				thisST.twit.search(thisST.query);
				thisST.lastquery = thisST.query;
				Spaz.UI.statusBar("Searching for '" + thisST.query + "'…");
				Spaz.UI.showLoading();
			}
		},
		'data_success': function(e, data) {
			sch.dump(e);
			var query_info = data[1];
			data = data[0];
			
			data = data.reverse();
			var no_dupes = [];
			var md = new Showdown.converter();
			
			
			var sui = new SpazImageURL();
			
			for (var i=0; i < data.length; i++) {
				
				/*
					only add if it doesn't already exist
				*/
				if (jQuery('#timeline-search div.timeline-entry[data-status-id='+data[i].id+']').length<1) {
					
					data[i].SC_thumbnail_urls = sui.getThumbsForUrls(data[i].text);
					
					data[i].text = sc.helpers.makeClickable(data[i].text, SPAZ_MAKECLICKABLE_OPTS);

					if (Spaz.Prefs.get('usemarkdown')) {
						data[i].text = md.makeHtml(data[i].text);
						data[i].text = data[i].text.replace(/href="([^"]+)"/gi, 'href="$1" title="Open link in a browser window" class="inline-link"');
					}
					
					no_dupes.push(data[i]);
					
				}
				
			};
			
			if (no_dupes.length > 0) {
				thisST.timeline.addItems(no_dupes);
			}
			

			sc.helpers.markAllAsRead('#timeline-search div.timeline-entry'); // search are never "new"
			sc.helpers.updateRelativeTimes('#timeline-search a.status-created-at', 'data-created-at');
			jQuery('#timeline-search div.timeline-entry').removeClass('even').removeClass('odd');
			jQuery('#timeline-search div.timeline-entry:even').addClass('even');
			jQuery('#timeline-search div.timeline-entry:odd').addClass('odd');

			Spaz.UI.hideLoading();
			Spaz.UI.statusBar("Ready");
		},
		'data_failure': function(e, error_obj) {
			var err_msg = "There was an error retrieving your favorites";
			Spaz.UI.statusBar(err_msg);

			/*
				Update relative dates
			*/
			sc.helpers.updateRelativeTimes('#timeline-search a.status-created-at', 'data-created-at');
			Spaz.UI.hideLoading();
		},
		'renderer': function(obj) {
			
			var html = Spaz.Tpl.parse('timeline_entry', obj);
			return html;
			
		}
	});
};

SearchTimeline.prototype = new AppTimeline();




/**
 * Followers/following timeline def 
 */
var FollowersTimeline = function(args) {
	
	var thisFLT = this;
	
	this.twit = new SpazTwit();

	
	/*
		set up the user timeline
	*/
	this.timeline  = new SpazTimeline({
		'timeline_container_selector' :'#timeline-followerslist',
		'entry_relative_time_selector':'.status-created-at',
		
		'success_event':'get_followerslist_succeeded',
		'failure_event':'get_followerslist_failed',
		'event_target' :document,
		
		'refresh_time':-1, // never automatically
		'max_items':200,

		'request_data': function() {
			sc.helpers.markAllAsRead('#timeline-followerslist div.timeline-entry');
			var username = Spaz.Prefs.getUser();
			var password = Spaz.Prefs.getPass();
			thisFLT.twit.setCredentials(username, password);
			thisFLT.twit.getFollowersList();
			Spaz.UI.statusBar("Loading followerslist");
			Spaz.UI.showLoading();
		},
		'data_success': function(e, data) {
			// alert('got follower data');
			data = data.reverse();
			
			var no_dupes = [];
			
			for (var i=0; i < data.length; i++) {
				
				/*
					only add if it doesn't already exist
				*/
				if (jQuery('#timeline-followerslist div.timeline-entry[data-status-id='+data[i].id+']').length<1) {
					
					no_dupes.push(data[i]);
					/*
						Save to DB via JazzRecord
					*/
					TwUserModel.findOrCreate(data[i]);
				}
				
			};
			
			thisFLT.timeline.addItems(no_dupes);

			jQuery('#timeline-followerslist div.timeline-entry').removeClass('even').removeClass('odd');
			jQuery('#timeline-followerslist div.timeline-entry:even').addClass('even');
			jQuery('#timeline-followerslist div.timeline-entry:odd').addClass('odd');

			Spaz.UI.hideLoading();
			Spaz.UI.statusBar("Ready");
			
		},
		'data_failure': function(e, error_obj) {
			var err_msg = "There was an error retrieving the user timeline";
			Spaz.UI.statusBar(err_msg);

			/*
				Update relative dates
			*/
			sc.helpers.updateRelativeTimes('#timeline-followerslist a.status-created-at', 'data-created-at');
			Spaz.UI.hideLoading();
		},
		'renderer': function(obj) {
			// sch.error(obj);
			return Spaz.Tpl.parse('followerslist_row', obj);
			
		}
	});
	
};

FollowersTimeline.prototype = new AppTimeline();


/**
 * Initialize the timelines 
 */
Spaz.Timelines.init = function() {
	Spaz.Timelines.friends   = new FriendsTimeline();
	Spaz.Timelines.user      = new UserTimeline();
	Spaz.Timelines.public    = new PublicTimeline();
	Spaz.Timelines.search    = new SearchTimeline();
	Spaz.Timelines.followers = new FollowersTimeline();
	
	Spaz.Timelines.map = {
		'friends':Spaz.Timelines.friends,
		'user':   Spaz.Timelines.user,
		'public': Spaz.Timelines.public,
		'search': Spaz.Timelines.search,
		'followerslist':Spaz.Timelines.followerslist
	}
}

Spaz.Timelines.getTimelineFromTab = function(tab) {
	var sectionStr = tab.id.replace(/tab-/, '');
	Spaz.dump('section for tab:' + sectionStr);
	return Spaz.Section[sectionStr];
};
