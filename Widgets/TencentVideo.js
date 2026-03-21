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
                    name: "category",
                    title: "分类",
                    type: "enumeration",
                    value: "tv",
                    enumOptions: [
                        { title: "📺 剧集", value: "tv" },
                        { title: "🐰 动漫", value: "anime" },
                        { title: "🎤 综艺", value: "variety" },
                        { title: "🎬 电影", value: "movie" }
                    ]
                },
                {
                    name: "sortBy",
                    title: "排序",
                    type: "enumeration",
                    value: "hot",
                    enumOptions: [
                        { title: "🔥 平台热度榜", value: "hot" },
                        { title: "🆕 最新上线榜", value: "new" },
                        { title: "🏆 TMDB 高分榜", value: "top" }
                    ]
                },
                {
                    name: "page",
                    title: "页码",
                    type: "page",
                    startPage: 1
                }
            ]
        }
    ]
};

// 腾讯视频 TMDB 映射
const TENCENT_CONFIG = {
    network: "2007|3353",
    provider: "138",
    region: "CN",
    name: "腾讯视频"
};

const GENRE_MAP = {
    16: "动漫",
    10764: "综艺",
    10767: "综艺"
};

function getGenre(ids) {
    if (!ids) return "影视";
    const g = ids.map(id => GENRE_MAP[id]).filter(Boolean);
    return g[0] || "影视";
}

function buildItem(item, isMovie) {
    return {
        id: String(item.id),
        type: "tmdb",
        mediaType: isMovie ? "movie" : "tv",

        title: item.title || item.name,
        releaseDate: item.release_date || item.first_air_date || "",

        posterPath: item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
            : "",
        backdropPath: item.backdrop_path 
            ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` 
            : "",

        rating: item.vote_average?.toFixed(1) || "0.0",

        genreTitle: getGenre(item.genre_ids),

        description: `腾讯视频 | ⭐ ${item.vote_average?.toFixed(1) || "0.0"}`
    };
}

async function loadTencentList(params = {}) {
    try {
        const category = params.category || "tv";
        const sortBy = params.sortBy || "hot";
        const page = params.page || 1;

        const today = new Date().toISOString().split("T")[0];
        const isMovie = category === "movie";

        const endpoint = isMovie ? "/discover/movie" : "/discover/tv";

        let query = {
            language: "zh-CN",
            page: page
        };

        // 腾讯视频过滤
        if (isMovie) {
            query.with_watch_providers = TENCENT_CONFIG.provider;
            query.watch_region = "CN";
        } else {
            query.with_networks = TENCENT_CONFIG.network;
        }

        // 分类过滤
        if (category === "anime") {
            query.with_genres = "16";
        } else if (category === "variety") {
            query.with_genres = "10764|10767";
        } else if (category === "tv") {
            query.without_genres = "16,10764,10767";
        }

        // 排序逻辑
        if (sortBy === "hot") {
            query.sort_by = "popularity.desc";
            query["vote_count.gte"] = 10;
        } 
        else if (sortBy === "new") {
            query.sort_by = isMovie 
                ? "primary_release_date.desc" 
                : "first_air_date.desc";

            if (isMovie) {
                query["primary_release_date.lte"] = today;
            } else {
                query["first_air_date.lte"] = today;
            }
        } 
        else if (sortBy === "top") {
            query.sort_by = "vote_average.desc";
            query["vote_count.gte"] = 50;
        }

        const res = await Widget.tmdb.get(endpoint, { params: query });

        const list = (res.results || [])
            .map(item => buildItem(item, isMovie))
            .filter(Boolean);

        if (list.length === 0) {
            return [{
                id: "empty",
                type: "text",
                title: "暂无数据",
                description: "未找到相关内容"
            }];
        }

        return list;

    } catch (e) {
        console.error(e);
        return [{
            id: "error",
            type: "text",
            title: "加载失败",
            description: "请稍后重试"
        }];
    }
}
