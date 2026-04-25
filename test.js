// ================= TMDB 直连封装 =================
const TMDB_TOKEN = "49e0cc55d9b39b0bd57e1882ca15a55e"; // ⚠️ 必填

async function tmdbRequest(path, params = {}) {
  const baseURL = "https://api.themoviedb.org/3";
  try {
    const res = await Widget.http.get(baseURL + path, {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`
      },
      params: {
        language: "zh-CN",
        ...params
      }
    });
    return res.data || {};
  } catch (e) {
    console.error("TMDB请求失败:", path, e.message);
    return {};
  }
}

// ================= 工具函数 =================
const GENRE_MAP = {
  28:"动作",12:"冒险",16:"动画",35:"喜剧",80:"犯罪",99:"纪录片",
  18:"剧情",10751:"家庭",14:"奇幻",36:"历史",27:"恐怖",10402:"音乐",
  9648:"悬疑",10749:"爱情",878:"科幻",53:"惊悚",10752:"战争",37:"西部",
  10759:"动作冒险",10764:"真人秀",10765:"科幻奇幻"
};

function getGenreText(ids){
  if(!ids) return "";
  return ids.map(id=>GENRE_MAP[id]).filter(Boolean).slice(0,3).join(" / ");
}

function buildItem({id,tmdbId,type,title,date,poster,backdrop,rating,genreText,subTitle,desc}){
  const base = date ? `${date} · ${subTitle||("⭐ "+rating)}` : (subTitle||("⭐ "+rating));
  return {
    id:String(id),
    tmdbId:tmdbId,
    type:"tmdb",
    mediaType:type,
    title:title,
    genreTitle:genreText|| (type==="tv"?"剧集":"电影"),
    description: base + (desc?`\n${desc}`:"\n暂无简介"),
    releaseDate:date,
    posterPath:poster?`https://image.tmdb.org/t/p/w500${poster}`:"",
    backdropPath:backdrop?`https://image.tmdb.org/t/p/w780${backdrop}`:"",
    rating:parseFloat(rating)||0,
    subTitle
  };
}

// ================= TMDB 相关 =================

// discover
async function fetchTmdbDiscover(type, params){
  const data = await tmdbRequest(`/discover/${type}`, params);
  if(!data.results || data.results.length===0){
    return params.page===1?[{id:"empty",type:"text",title:"暂无数据"}]:[];
  }

  return data.results.map(item=>{
    const date = item.first_air_date||item.release_date||"";
    return buildItem({
      id:item.id,
      tmdbId:item.id,
      type:type,
      title:item.name||item.title,
      date:date,
      poster:item.poster_path,
      backdrop:item.backdrop_path,
      rating:item.vote_average?.toFixed(1),
      genreText:getGenreText(item.genre_ids),
      subTitle:`⭐ ${item.vote_average?.toFixed(1)}`,
      desc:item.overview
    });
  });
}

// detail
async function fetchTmdbDetail(id,type,stats,title){
  const d = await tmdbRequest(`/${type}/${id}`);
  if(!d.id) return null;

  const date = d.first_air_date||d.release_date||"";
  const genreText = (d.genres||[]).map(g=>g.name).slice(0,3).join(" / ");

  return buildItem({
    id:d.id,
    tmdbId:d.id,
    type:type,
    title:d.name||d.title||title,
    date:date,
    poster:d.poster_path,
    backdrop:d.backdrop_path,
    rating:d.vote_average?.toFixed(1),
    genreText:genreText,
    subTitle:stats,
    desc:d.overview
  });
}

// search
async function searchTmdb(query,type){
  const data = await tmdbRequest(`/search/${type}`,{query});
  return (data.results||[])[0];
}

// fallback
async function fetchTmdbFallback(type){
  const data = await tmdbRequest(`/trending/${type}/day`);
  return (data.results||[]).slice(0,15).map(item=>{
    const date = item.first_air_date||item.release_date||"";
    return buildItem({
      id:item.id,
      tmdbId:item.id,
      type:type,
      title:item.name||item.title,
      date:date,
      poster:item.poster_path,
      rating:item.vote_average?.toFixed(1),
      genreText:getGenreText(item.genre_ids),
      subTitle:"TMDB Trending",
      desc:item.overview
    });
  });
}

// ================= 主功能 =================

// 平台分流
async function loadPlatformMatrix(params={}){
  const {sort_by="2007",category="tv_drama",sort="popularity.desc",page=1}=params;

  const query={
    sort_by:sort,
    page,
    include_adult:false
  };

  if(category.startsWith("tv")){
    query.with_networks=sort_by;
    return await fetchTmdbDiscover("tv",query);
  }else{
    query.with_watch_providers=sort_by;
    query.watch_region="US";
    return await fetchTmdbDiscover("movie",query);
  }
}

// 热榜（简化版：只走 TMDB）
async function loadTrendHub(params={}){
  const {page=1}=params;
  const data = await tmdbRequest(`/trending/all/week`,{page});

  return (data.results||[]).map(item=>{
    const type = item.media_type==="tv"?"tv":"movie";
    const date = item.first_air_date||item.release_date||"";

    return buildItem({
      id:item.id,
      tmdbId:item.id,
      type:type,
      title:item.name||item.title,
      date:date,
      poster:item.poster_path,
      backdrop:item.backdrop_path,
      rating:item.vote_average?.toFixed(1),
      genreText:getGenreText(item.genre_ids),
      subTitle:"🔥 热榜",
      desc:item.overview
    });
  });
}
