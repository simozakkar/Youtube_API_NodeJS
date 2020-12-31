/* const express   = require('express'); */
const mysql     = require('mysql');
const {google}  = require('googleapis');
/* const app       = express();
app.use(express.static('public'));
// make the server listen to requests
app.listen(3000 , ()=>{
    console.log('Listen port : 3000 ======================');
});
 */
const auth = '[YouTube_API_KEY]';
const query = 'hi';
const dateA='2017-01-01 00:00:00';
const dateB='2018-05-02 02:00:00';
const dateSearch='2019-12-10 02:00:00';

// v3 of the youtube API, and using an API key to authenticate.
const youtube = google.youtube({
    version : 'v3',
    auth :auth
});
//create connection 
const con = mysql.createConnection({
    host: "localhost",
    user: "newuser",
    password: "newuser",
    database : 'YOUTUBE_DATA_API'
});

//convert datetime '2019-01-01T02:00:00Z' ==> '2019-01-01 02:00:00 '
function convertDatetime(str)
{
    str=str.replace('Z',' ');
    str=str.replace('T',' ');
    return str;
}
//connect database mysql 
const connectDB = () => {
    return new Promise((resolve, reject) => {
         con.connect(err => {
             if (err) reject(err);
             console.log("DATABASE  connected (*-*)");
             resolve(1);
         })
    })
}
//
const execute = (requet)=>{
    return new Promise((resolve,reject)=>{
        con.query(requet,(err,res)=>{
            if(err)reject(err);
            resolve(res);
        })
    })
}
const exist_video = (videoId)=>{
    return new Promise((resolve,reject)=>{
        con.query("SELECT count(*) as c from videos where id_vid = '"+videoId+"'",(err,res)=>{
            if (err) throw err;
            resolve(res[0].c);
        })
    })
    
}
const EXIST_channel = (channelId)=>{
    return new Promise ((resolve, reject)=>{
        con.query("SELECT count(*) as c from channels where id_channel = '"+channelId+"'",(err,res)=>{
            if (err) reject(err);
            resolve(res[0].c);
        })
    })
}
const searchList = ()=>{
    return new Promise((resolve, reject) => {
        youtube.search.list({
            "part": "snippet",
            "maxResults":5,
            "q":query,
        }, (err, res) => {
            if (err) reject(err);
            console.log("")
            resolve(res);
        });
    })
}
const channelList = (channelId)=>{
    return new Promise((resolve,reject)=>{
        youtube.channels.list({
            part: "snippet,contentDetails,statistics",
            id: channelId
        }, (err,res) => {
            if (err)reject(err);
            resolve(res);
        })
    })
}
const threadList = (videoId)=>{
    return new Promise((resolve, reject)=>{
        youtube.commentThreads.list({
            "part":"snippet,replies",
            "videoId": videoId,
            "maxResults": 5
            }, (err, res) => {
            if (err) reject(err);
            resolve(res);
        })
    }) 
}
const videoList = (videoId)=>{
    return new Promise((resolve,reject)=>{
        youtube.videos.list({
            "part": "snippet,contentDetails,statistics",
            "id": videoId
        }, (err, res) => {
            if (err) reject(err);
            resolve(res);
        })
    })
}
const id = ()=>{
    return new Promise((resolve,reject)=>{
        con.query("select id_query from queries where query='"+query+"'",(err,res)=>{
            if(err)reject(err);
            if(res.length){
                resolve(res[0].id_query);
            }
            else{
                con.query("select max(id_query)as max from queries",(err,res)=>{
                    if (err)reject(err);
                    if(res[0].max != null)resolve(res[0].max+1);
                    else  resolve(0);
                });
            }
        });
    })
}
const  INSERT_channels = async (channelId) =>{
            let exist = await EXIST_channel(channelId);
            if (!exist){
                let response_channel = await channelList(channelId);
                let array = response_channel.data.items[0];
                array.snippet.publishedAt= convertDatetime(array.snippet.publishedAt);
                array.snippet.description=array.snippet.description.replace(/'/g," ");
                array.snippet.title=array.snippet.title.replace(/'/g," ");
                let requet = "INSERT IGNORE INTO Channels VALUES ('"+array.id+"','"+array.snippet.title+"','"+array.snippet.description+"','"+array.snippet.publishedAt+"',"+array.statistics.viewCount+","+array.statistics.subscriberCount+","+array.statistics.videoCount+")";
                await execute(requet);
            }
}
const INSERT_comments = (replies,threadId)=>{
    return new Promise (async (resolve,reject )=>{
        for (let i = 0; i < replies.length; i++) {
            let snippet = replies[i].snippet;
            await INSERT_channels(snippet.authorChannelId.value,con,youtube);
            console.log("Channel inserted  *|* (comment)");
            snippet.publishedAt=convertDatetime(snippet.publishedAt);
            snippet.authorDisplayName=snippet.authorDisplayName.replace(/'/g," ");
            snippet.textOriginal=snippet.textOriginal.replace(/'/g," ");
            let requet = "INSERT IGNORE INTO comments values('"+replies[i].id+"','"+snippet.authorDisplayName+"','"+snippet.textOriginal+"','"+snippet.publishedAt+"',"+snippet.likeCount+",'"+threadId+"','"+snippet.authorChannelId.value+"')"; 
            await execute(requet);
            console.log("Comment inserted number : "+i);
        }
        resolve(1);
    })
}
const  INSERT_thread = (videoId)=>{
        return new Promise(async(resolve,reject)=>{
            let exist_videos = await exist_video(videoId);
            if(exist_videos){
                let res = await threadList(videoId);
                let arrays=res.data.items;
                for (let i = 0; i < arrays.length; i++) {
                    let snippet = arrays[i].snippet.topLevelComment.snippet;
                    await INSERT_channels(snippet.authorChannelId.value,con,youtube);
                    console.log("Channel inserted  *|* (comment thread)");
                    snippet.publishedAt=convertDatetime(snippet.publishedAt);
                    snippet.authorDisplayName=snippet.authorDisplayName.replace(/'/g," ");
                    snippet.textOriginal=snippet.textOriginal.replace(/'/g," ");
                    let requet = "INSERT IGNORE INTO commentsThread values('"+arrays[i].id+"','"+snippet.authorDisplayName+"','"+snippet.textOriginal+"','"+snippet.publishedAt+"',"+snippet.likeCount+",'"+snippet.videoId+"','"+snippet.authorChannelId.value+"')"; 
                    await execute(requet);
                    console.log("Comment Thread inserted number : "+i);
                    if(arrays[i].snippet.totalReplyCount){
                        await INSERT_comments(arrays[i].replies.comments,arrays[i].id);
                    }
                }
            }
            resolve(1);
        })
}
async function INSERT_videos (videoId,con,youtube){
            let exist_videos = await exist_video(videoId);
            if (!exist_videos){
                    let res = await videoList(videoId);
                    let array = res.data.items[0];
                    let chan = await INSERT_channels(array.snippet.channelId,con,youtube);
                    console.log("Channel inserted *|* (video)");
                    array.snippet.publishedAt=convertDatetime(array.snippet.publishedAt);
                    array.snippet.description=array.snippet.description.replace(/'/g," ");
                    array.snippet.title=array.snippet.title.replace(/'/g," ");
                    let query_insert_video = "INSERT IGNORE INTO Videos VALUES ('"+array.id+"','"+array.snippet.title+"','"+array.snippet.description+"','"+array.snippet.publishedAt+"',"+array.statistics.viewCount+","+array.statistics.likeCount+","+array.statistics.dislikeCount+","+array.statistics.commentCount+",'"+array.snippet.channelId+"')";
                    if(array.statistics.commentCount == undefined){
                        query_insert_video = "INSERT IGNORE INTO Videos VALUES ('"+array.id+"','"+array.snippet.title+"','"+array.snippet.description+"','"+array.snippet.publishedAt+"',"+array.statistics.viewCount+","+array.statistics.likeCount+","+array.statistics.dislikeCount+",0,'"+array.snippet.channelId+"')";
                    }
                    await execute(query_insert_video);
                    console.log("Video inserted ");
                    if (array.statistics.commentCount != undefined) {
                            await INSERT_thread(videoId);  
                    }
            }
}
async function search(query,dateA,dateB,dateSearch){
    await connectDB();
    const response = await searchList();
    if(response.data.items.length != 0){
        console.log("let's go (*-*) ");
        let id_Query = await id();
        console.log("Id query is  : "+id_Query);
        let requet = "INSERT INTO queries values("+id_Query+",'"+dateA+"','"+dateB+"','"+dateSearch+"','"+query+"')";
        await execute(requet);
        console.log("Query inserted");
        let array=response.data.items;
        for (let i = 0; i < array.length; i++) {
            console.log("Video number "+i);
            const insert_video = await INSERT_videos(array[i].id.videoId);
            let requet_concern = "INSERT IGNORE INTO concern values("+id_Query+",'"+dateA+"','"+dateB+"','"+dateSearch+"','"+array[i].id.videoId+"')";
            await execute(requet_concern);
            console.log("Concern inserted "+i);
        }
        console.log("DONE");
    }
}
search(query,dateA,dateB,dateSearch).catch(err=>{
    console.error(err);
}); 