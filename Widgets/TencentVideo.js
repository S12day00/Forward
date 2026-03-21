var WidgetMetadata = {
    id: "TencentVideo",
    title: "腾讯视频",
    description: "腾讯视频专区",
    author: "就像风住了风又起",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    site: "https://github.com/S12day00/Forward",
    modules: [
        {
            title: "腾讯视频",
            functionName: "loadPlatformList",
            type: "video",
            cacheDuration: 3600,
            params: [
                {
                    name: "mediaType",
                    title: "影视类型",
                    type: "enumeration",
                    value: "tv",
                    enumOptions: [
                        { title: "剧集", value: "tv" },
                        { title: "动漫", value: "anime" },
                        { title: "综艺", value: "variety" },
                        { title: "电影", value: "movie" }
                    ]
                },   
                {
                    name: "sortBy",
                    title: "排序方式",
                    type: "enumeration",
                    value: "hot",
                    enumOptions: [
                        { title: "平台热度榜", value: "hot" },
                        { title: "最新上线榜", value: "new" },
                        { title: "TMDB 高分榜", value: "top" }
                    ]
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        }
    ]
};

// ✅ 固定腾讯平台配置
const PLATFORM_CONFIG = {
    network: "2007|3353",
    provider: "138",
    region: "CN",
    name: "腾讯"
};

// 分类映射
const GENRE_MAP = {
    28: "动作", 12: "冒险", 16: "动画", 35: "喜剧", 80: "犯罪", 99: "纪录片",
    18: "剧情", 10751: "家庭", 14: "奇幻", 36: "历史", 27: "恐怖", 10402: "音乐",
    9648: "悬疑", 10749: "爱情", 878: "科幻", 10770: "电视电影", 53: "惊悚",
    10752: "战争", 37: "西部", 10759: "动作冒险", 10764: "真人秀", 10767: "脱口秀"
};

function getGenreText(ids) {
    if (!ids || !Array.isArray(ids)) return "影视";
    const genres = ids.map(id => GENRE_MAP[id]).filter(Boolean);
    return genres.length > 0 ? genres.slice(0, 2).join(" / ") : "影视";
}

// 数据构建
function buildItem(item, isMovie) {
    if (!item) return null;

    const mediaType = isMovie ? "movie" : "tv";
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date || "";
    const score = item.vote_average ? item.vote_average.toFixed(1) : "0.0";
    const genreText = getGenreText(item.genre_ids);

    let typeTag = isMovie ? "🎬" : "📺";
    if (item.genre_ids?.includes(16)) typeTag = "🐰";
    if (item.genre_ids?.includes(10764) || item.genre_ids?.includes(10767)) typeTag = "🎤";

    return {
        id: String(item.id),
        tmdbId: parseInt(item.id),
        type: "tmdb",
        mediaType: mediaType,
        title: title,
        genreTitle: genreText,
        description: `${typeTag} 腾讯 | ⭐ ${score}`,
        releaseDate: releaseDate,
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
        backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "",
        rating: score
    };
}

// 主请求函数
async function loadPlatformList(params) {
    const mediaType = params.mediaType || "tv";
    const category = params.sortBy || "hot";
    const page = params.page || 1;

    const today = new Date().toISOString().split('T')[0];
    const isMovie = (mediaType === "movie");
    const endpoint = isMovie ? "/discover/movie" : "/discover/tv";

    let queryParams = {
        language: "zh-CN",
        page: page
    };

    // ✅ 腾讯筛选
    if (isMovie) {
        queryParams.with_watch_providers = PLATFORM_CONFIG.provider;
        queryParams.watch_region = PLATFORM_CONFIG.region;
    } else {
        queryParams.with_networks = PLATFORM_CONFIG.network;
    }

    // 分类过滤
    if (mediaType === "anime") {
        queryParams.with_genres = "16";
    } else if (mediaType === "variety") {
        queryParams.with_genres = "10764|10767";
    } else if (mediaType === "tv") {
        queryParams.without_genres = "16,10764,10767";
    }

    // 排序逻辑
    if (category === "hot") {
        queryParams.sort_by = "popularity.desc";
        queryParams["vote_count.gte"] = 2;
    } 
    else if (category === "new") {
        queryParams.sort_by = isMovie ? "primary_release_date.desc" : "first_air_date.desc";
        if (isMovie) {
            queryParams["primary_release_date.lte"] = today;
        } else {
            queryParams["first_air_date.lte"] = today;
        }
    } 
    else if (category === "top") {
        queryParams.sort_by = "vote_average.desc";
        queryParams["vote_count.gte"] = 30;
    }

    try {
        const res = await Widget.tmdb.get(endpoint, { params: queryParams });
        const items = (res.results || [])
            .map(i => buildItem(i, isMovie))
            .filter(Boolean);

        if (items.length === 0) {
            return [{
                id: "empty",
                type: "text",
                title: "暂无内容",
                description: "当前分类暂无腾讯影视数据"
            }];
        }

        return items;

    } catch (error) {
        return [{
            id: "error",
            type: "text",
            title: "加载失败",
            description: "网络请求异常，请稍后重试"
        }];
    }
}
