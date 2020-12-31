--Q1
Create view v1 as select id_query, max(likeCount_vid) as max
	from videos V, concern C
	where V.id_vid = C.id_vid
	group by C.id_query ;

Select distinct V.id_vid, title_vid
	from videos V , Concern C , V1;

--Q2

Create view V2 as select id_query, max(DislikeCount_vid) as max
	from videos V, concern C
	where V.id_vid = C.id_vid
	group by C.id_query;

Select V.id_vid , title_vid from videos V, Concern C , V2
	where V.id_vid = C.id_vid
	and V2.id_query = C.id_query
	and V.DislikeCount_vid = V2.max ;

--Q3

SELECT Q.id_query ,
		Query ,
		C.publishedAfter ,
		C.publishedBefore ,
		Count(*) as nbVideos
	FROM concern C , videos V , queries Q
	WHERE C.id_vid = V.id_vid
	And Q.id_query = C.id_query
	GROUP BY id_query, publishedAfter, publishedBefore
;
--Q4

SELECT V.id_vid,title_vid,
	count(C.id_com)+count(distinct T.id_thread) as nbComment,
	count(distinct C.id_channel)+count(distinct T.id_channel)as nbutilisateurs
FROM videos V,comments C,commentsthread T
WHERE V.id_vid = T.id_vid and T.id_thread = C.id_thread
Group by V.id_vid;

--Q5

SELECT id_vid,title_vid,likeCount_vid from videos
	where likeCount_vid = (select max(likeCount_vid)
							From videos
								where id_vid in (select id_vid from concern C
								where C.id_query in (select id_query from queries Q
								where Q.query = 'what is api') ))
;

--Q6

Create view vi As select Q.id_query,query,max(CommentCount_vid)As nbcomment
	from videos V ,concern C ,queries Q
		where V.id_vid = C.id_vid
		and Q.id_query = C.id_query
 		group by Q.id_query;
Select distinct title_vid,V.id_vid from videos V,concern C ,vi
		where V.id_vid = C.id_vid
		and vi.id_query = C.id_query
		and V.CommentCount_vid = vi.nbcomment
;
--Q7

Create view V11 as select distinct V.id_vid
	from videos V , concern C , queries Q
	where C.id_vid = V.id_vid
	and C.id_query = Q.id_query
	and query = 'nice'
	and likeCount_vid = (select max(V.likeCount_vid)
	from videos V , concern C , queries Q
	where C.id_vid = V.id_vid
	and C.id_query = Q.id_query 
	and query = 'nice' );
Select authorName,id_thread,V.likeCount_vid,T.likeCount_thr
	from commentsThread T,videos V
	where T.id_vid = V.id_vid and V.id_vid = (select id_vid from V11)
	and likeCount_thr=(select max(likeCount_thr)
	from commentsThread T
	where T.id_vid=(select id_vid from V11));