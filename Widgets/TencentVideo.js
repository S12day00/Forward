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
            params: [
                {
                    name: "MediaType",
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
                    name: "SortBy",
                    title: "排序方式",
                    type: "enumeration",
                    value: "hot",
                    enumOptions: [
                        { title: "平台热度榜", value: "hot" },
                        { title: "最新上线榜", value: "new" },
                        { title: "TMDB高分榜", value: "top" }
                    ]
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        }
    ]
};

// 腾讯视频 TMDB ID
const TENCENT_CONFIG = {
    network: "2007|3353",
    provider: "138",
    region: "CN",
    name: "腾讯视频"
};

// 类型映射
function getCategoryParams(category, isMovie) {
    let params = {};

    if (category === "anime") {
        params.with_genres = "16";
    } else if (category === "variety") {
        params.with_genres = "10764|10767";
    } else if (category === "tv") {
        params.without_genres = "16,10764,10767";
    }

    return params;
}

// 构建卡片
function buildItem(item, isMovie) {
    if (!item) return null;

    const title = item.title || item.name;
    const score = item.vote_average ? item.vote_average.toFixed(1) : "0.0";

    return {
        id: String(item.id),
        tmdbId: parseInt(item.id),
        type: "tmdb",
        mediaType: isMovie ? "movie" : "tv",
        title: title,
        description: `📺 腾讯视频 | ⭐ ${score}`,
        releaseDate: item.release_date || item.first_air_date || "",
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
        backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "",
        rating: score
    };
}

// 主函数
async function loadTencentList(params) {
    const category = params.category || "tv";
    const sortBy = params.sortBy || "hot";
    const page = params.page || 1;

    const isMovie = (category === "movie");
    const endpoint = isMovie ? "/discover/movie" : "/discover/tv";

    let queryParams = {
        language: "zh-CN",
        page: page
    };

    // 腾讯限制
    if (isMovie) {
        queryParams.with_watch_providers = TENCENT_CONFIG.provider;
        queryParams.watch_region = TENCENT_CONFIG.region;
    } else {
        queryParams.with_networks = TENCENT_CONFIG.network;
    }

    // 分类过滤
    Object.assign(queryParams, getCategoryParams(category, isMovie));

    // 排序逻辑
    const today = new Date().toISOString().split('T')[0];

    if (sortBy === "hot") {
        queryParams.sort_by = "popularity.desc";
        queryParams["vote_count.gte"] = 2;
    } 
    else if (sortBy === "new") {
        queryParams.sort_by = isMovie ? "primary_release_date.desc" : "first_air_date.desc";
        if (isMovie) {
            queryParams["primary_release_date.lte"] = today;
        } else {
            queryParams["first_air_date.lte"] = today;
        }
    } 
    else if (sortBy === "top") {
        queryParams.sort_by = "vote_average.desc";
        queryParams["vote_count.gte"] = 30;
    }

    try {
        const res = await Widget.tmdb.get(endpoint, { params: queryParams });
        const items = (res.results || []).map(i => buildItem(i, isMovie)).filter(Boolean);

        if (items.length === 0) {
            return [{
                id: "empty",
                type: "text",
                title: "暂无内容",
                description: "当前分类暂无数据"
            }];
        }

        return items;

    } catch (e) {
        return [{
            id: "error",
            type: "text",
            title: "加载失败",
            description: "请稍后重试"
        }];
    }
}
