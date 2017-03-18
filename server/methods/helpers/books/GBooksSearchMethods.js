GBooksSearch = {
  api: "14e1a56e4d03b85e51b78fcfd6e055ec",
  language: "en"
};
//https://www.googleapis.com/books/v1/volumes?q=quilting
//https://www.googleapis.com/books/v1/{collectionName}/resourceID?parameters
//https://books.google.com/books/content/images/frontcover/JlWhoFm8-TgC?fife=w600-rw

Meteor.methods({
  GBooksSearch:function(search, type){
    check(search, String);
    check(type, String);

    try {
      var response = HTTP.call("GET", "https://www.googleapis.com/books/v1/volumes?q=" + search, {});
    }
    catch (error) {
      console.log(error);
      return error.status_message;
    }

    var results = [];
    var quantity = response.data.items.length < 15 ? response.data.items.length : 15;

    if (response.data.totalItems > 0) {
      for (i = 0; i < quantity; i++) {
        var id = response.data.items[i].volumeInfo.industryIdentifiers[0].identifier || 0;
        var gid = response.data.items[i].id || 0;
        var title = response.data.items[i].volumeInfo.title || "Unknown";
        var release_date = response.data.items[i].volumeInfo.publishedDate || 0;
        var year = (release_date != 0) ? release_date.slice(0,4) : 0;
        var overview = response.data.items[i].volumeInfo.description || "No overview found.";
        overview = (overview.length > 250) ? overview.slice(0,250) + "..." : overview;
        var poster_path = "https://books.google.com/books/content/images/frontcover/" + gid + "?fife=w450-rw";
        var link = "https://books.google.com/books?id=" + id;
        var media_type = "book";
        var index = i;

        results.push({
          "id": id,
          "gid": gid,
          "title": title,
          "year": year,
          "release_date": release_date,
          "overview": overview,
          "poster_path": poster_path,
          "link": link,
          "media_type": media_type,
          "index": index
        });
      }
    }
    return results
  },

  book:function(id, type){


    try {
      var response = HTTP.call("GET", "https://www.googleapis.com/books/v1/volumes/" + id , {timeout: 4000} );
    }
    catch (error) {
      console.log(error);
      return false;
    }

    return response.data.poster_path
  },

  externalId:function(id, type){


    try {
        var response = HTTP.call("GET", "https://www.googleapis.com/books/v1/volumes?q=" + id, {timeout: 4000} );
    } catch (error) {
        console.log(error);
        throw new Meteor.Error(503, id);
        throw new Meteor.Error(503, "Unabled to get external ids");
    }
    
     if (response.data.items) {
        return response.data.items[0].id;
    } else {
        throw new Meteor.Error(503, "Unabled to get external ids");
    }
  }
});


GBooksSearch.externalId = function(id, type) {
  return Meteor.call("externalId", id, type, {}
)};
