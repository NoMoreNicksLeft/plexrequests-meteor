Meteor.methods({
	"requestBook": function(request) {
		check(request, Object);
		var poster = request.poster_path;
		var settings = Settings.find({}).fetch()[0];

		// Check user request limit
		var date = Date.now() - 6.048e8;
		var weeklyLimit = Settings.find({}).fetch()[0].bookWeeklyLimit;
		var userRequestTotal = Books.find({user:request.user, createdAt: {"$gte": date} }).fetch().length;

		if (weeklyLimit !== 0
			&& (userRequestTotal >= weeklyLimit)
			&& !(Meteor.user())
			//Check if user has override permission
			&& (!settings.plexAuthenticationENABLED || !Permissions.find({permUSER: request.user}).fetch()[0].permLIMIT)) {

				return "limit";
			}


			try {
				var gid = GBooksSearch.externalId(request.id, "book");
				if (!gid) {
					logger.error(("Error getting Google book ID, none found!"));
					return false;
				}
			} catch (error) {
				logger.error("Error getting Google book ID:", error.message);
				return false;
			}


			var tvdb = request.tvdb;
			function insertBook(request, gid, dlStatus, approvalStatus, poster)
			{

				Books.insert({
					title: request.title,
					id: request.id,
					gid: gid,
                    year: request.year, 
                    released: request.release_date,
                    user: request.user,
                    downloaded: dlStatus,
                    approval_status: approvalStatus,
                    poster_path: poster
				});
			}
			request["notification_type"] = "request";
			request["media_type"] = "Book";
			// Check if it already exists in SickRage or Sonarr
			try {
				if (settings.sickRageENABLED) {
					if (SickRage.checkShow(tvdb)) {
						try {
							var stat = SickRage.statsShow(tvdb);
							insertBook(request, gid, false, 1, poster);
							return "exists";
						}
						catch (error) {
							logger.error(error.message);
							return false
						}
					}
				} else if (settings.sonarrENABLED) {
					if (Sonarr.seriesGet(tvdb)) {
						try {
							var stat = Sonarr.seriesStats(tvdb);
							insertBook(request, gid, false, 1, poster);
							return "exists";
						}
						catch (error) {
							logger.error(error.message);
							return false
						}
					}
				}
			}
			catch (error) {
				logger.error("Error checking SickRage/Sonarr:", error.message);
				return false;
			}

			//If approval needed and user does not have override permission
			if (settings.bookApproval
				//Check if user has override permission
				&& (!settings.plexAuthenticationENABLED || !Permissions.find({permUSER: request.user}).fetch()[0].permAPPROVAL)) {

					// Approval required
					// Add to DB but not SickRage/Sonarr
					insertBook(request, gid, false, 1, poster);
					Meteor.call("sendNotifications", request);
					return true;
				} else {
					//No approval required
					if (settings.sickRageENABLED) {
						try {
							var episodes = (request.episodes === true) ? 1 : 0;
							var add = SickRage.addShow(tvdb, episodes);
						}
						catch (error) {
							logger.error("Error adding to SickRage:", error.message);
							return false;
						}
						if (add) {
							try {
								insertBook(request, gid, false, 1, poster);
								Meteor.call("sendNotifications", request);
								return true;
							}
							catch (error) {
								logger.error(error.message);
								return false;
							}

						} else {
							logger.error("Error adding to SickRage");
							return false;
						}
					} else if (settings.sonarrENABLED) {
						try {
							var qualityProfileId = settings.sonarrQUALITYPROFILEID;
							var seasonFolder = settings.sonarrSEASONFOLDERS;
							var rootFolderPath = settings.sonarrROOTFOLDERPATH;
							var add = Sonarr.seriesPost(tvdb,request.title, qualityProfileId, seasonFolder, rootFolderPath, request.episodes);
						}
						catch (error) {
							logger.error("Error adding to Sonarr:", error.message);
							return false;
						}
						if (add) {
							try {
								insertBook(request, gid, false, 1, poster);
								Meteor.call("sendNotifications", request);
								return true;
							}
							catch (error) {
								logger.error(error.message);
								return false;
							}
						} else {
							logger.error("Error adding to Sonarr");
							return false;
						}
					} else {
						try {
							insertBook(request, gid, false, 1, poster);
							Meteor.call("sendNotifications", request);
							return true;
						}
						catch (error) {
							logger.error(error.message);
							return false;
						}
					}
				}
			}
		});
