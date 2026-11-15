import {
    Heart,
    MessageCircle,
    Share2,
    Bookmark,
    Link as LinkIcon,
  } from "lucide-react";
  import { cn } from "@/lib/utils";
  
  interface RuixenCard06Props {
    id?: string;
    author?: {
      name?: string;
      username?: string;
      avatar?: string;
      timeAgo?: string;
    };
    content?: {
      text?: string;
      link?: {
        title?: string;
        description?: string;
        icon?: React.ReactNode;
      };
    };
    engagement?: {
      likes?: number;
      comments?: number;
      shares?: number;
      isLiked?: boolean;
      isBookmarked?: boolean;
    };
    onLike?: () => void;
    onComment?: () => void;
    onShare?: () => void;
    onBookmark?: () => void;
  }
  
  const defaultProps: RuixenCard06Props = {
    author: {
      name: "Dorian Baffier",
      username: "dorian_baffier",
      avatar: "https://cdn.21st.dev/assets/mirror/51/513d06f542692036ff0bb17938f04b3efd60567ba2cae08049469d21f18e0524.jpg",
      timeAgo: "2h ago",
    },
    content: {
      text: "Just launched Ruixen UI! Check out the documentation and let me know what you think 🎨",
      link: {
        title: "Ruixen UI Documentation",
        description: "A comprehensive guide to Ruixen UI",
        icon: <LinkIcon className="w-5 h-5 text-blue-500" />,
      },
    },
    engagement: {
      likes: 128,
      comments: 32,
      shares: 24,
      isLiked: false,
      isBookmarked: false,
    },
  };
  
  export default function SocialPostCard({
    author = defaultProps.author,
    content = defaultProps.content,
    engagement = defaultProps.engagement,
    onLike,
    onComment,
    onShare,
    onBookmark,
    id = author?.username || "card-02",
  }: RuixenCard06Props) {
    return (
      <div className="w-full max-w-lg mx-auto rounded-xl bg-card text-foreground border border-border transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-3">
            <img
              src={author?.avatar}
              alt={author?.name}
              className="w-11 h-11 rounded-full border border-zinc-300 dark:border-zinc-600 object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{author?.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">@{author?.username} · {author?.timeAgo}</p>
            </div>
          </div>
          <div>
            <button type="button" onClick={onBookmark} aria-label={engagement?.isBookmarked?"Remover dos salvos":"Salvar pergunta"} aria-pressed={!!engagement?.isBookmarked} className="rounded-md p-2 focus-visible:outline-2 focus-visible:outline-offset-2" ><Bookmark aria-hidden="true" className={cn("w-5 h-5 transition", engagement?.isBookmarked ? "text-primary fill-current" : "text-muted-foreground")}/></button>
          </div>
        </div>
  
        {/* Content */}
        <div className="px-5 py-4 text-zinc-700 dark:text-zinc-300 text-base">
          {content?.text}
        </div>
  
        {/* Optional Link Box */}
        {content?.link && (
          <div className="mx-5 mb-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-white dark:bg-zinc-700">
                {content.link.icon}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{content.link.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{content.link.description}</p>
              </div>
            </div>
          </div>
        )}
  
        {/* Reactions Footer */}
        <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-700 text-sm text-center">
          <button
            type="button" aria-label="Curtir pergunta" aria-pressed={!!engagement?.isLiked}
            onClick={onLike}
            className={cn(
              "py-3 flex items-center justify-center gap-2 transition hover:bg-rose-50 dark:hover:bg-rose-900",
              engagement?.isLiked ? "text-rose-600 font-semibold" : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <Heart className={cn("w-4 h-4", engagement?.isLiked && "fill-current")} />
            {engagement?.likes}
          </button>
          <button
            type="button" aria-label={`Ver respostas: ${engagement?.comments??0}`}
            onClick={onComment}
            className="py-3 flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition"
          >
            <MessageCircle className="w-4 h-4" />
            {engagement?.comments}
          </button>
          <button
            type="button" aria-label="Compartilhar pergunta"
            onClick={onShare}
            className="py-3 flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900 transition"
          >
            <Share2 className="w-4 h-4" />
            {engagement?.shares}
          </button>
        </div>
      </div>
    );
  }
  