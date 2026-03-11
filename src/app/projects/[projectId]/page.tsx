"use client";

import { useState } from "react";
import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = "brand" | "competitor" | "product" | "industry";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Topic {
  id: string;
  name: string;
  keywords: { include: string[]; exclude: string[] };
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  topics: Topic[];
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const { data: project, mutate } = useSWR<Project>(
    `/api/projects/${projectId}`,
    fetcher
  );
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [category, setCategory] = useState<Category | undefined>(undefined);

  function addKeyword(type: "include" | "exclude") {
    const input = type === "include" ? keywordInput : excludeInput;
    const setter = type === "include" ? setIncludeKeywords : setExcludeKeywords;
    const inputSetter = type === "include" ? setKeywordInput : setExcludeInput;
    const list = type === "include" ? includeKeywords : excludeKeywords;

    if (input.trim() && !list.includes(input.trim())) {
      setter([...list, input.trim()]);
      inputSetter("");
    }
  }

  function removeKeyword(keyword: string, type: "include" | "exclude") {
    const setter = type === "include" ? setIncludeKeywords : setExcludeKeywords;
    const list = type === "include" ? includeKeywords : excludeKeywords;
    setter(list.filter((k) => k !== keyword));
  }

  async function handleCreateTopic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        keywords: {
          include: includeKeywords,
          exclude: excludeKeywords,
        },
        category: category || undefined,
      }),
    });

    if (res.ok) {
      mutate();
      setTopicDialogOpen(false);
      setIncludeKeywords([]);
      setExcludeKeywords([]);
    }
    setLoading(false);
  }

  async function handleDeleteTopic(topicId: string) {
    const res = await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
    if (res.ok) mutate();
  }

  async function handleDeleteProject() {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={handleDeleteProject}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Project
        </Button>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Topics</h3>
        <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Topic
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Monitoring Topic</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-name">Topic Name</Label>
                <Input
                  id="topic-name"
                  name="name"
                  placeholder="e.g., Our Brand"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val as Category)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="competitor">Competitor</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="industry">Industry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Keywords to Monitor</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword("include");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addKeyword("include")}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {includeKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(kw, "include")}
                    >
                      {kw} x
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Exclude Keywords (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={excludeInput}
                    onChange={(e) => setExcludeInput(e.target.value)}
                    placeholder="Words to filter out..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword("exclude");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addKeyword("exclude")}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {excludeKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(kw, "exclude")}
                    >
                      {kw} x
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || includeKeywords.length === 0}
              >
                {loading ? "Creating..." : "Add Topic"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {project.topics.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-4">
            <Tag className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No topics yet. Add a topic to start monitoring.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {project.topics.map((topic) => (
            <Card key={topic.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{topic.name}</CardTitle>
                  {topic.category && (
                    <CardDescription className="capitalize">
                      {topic.category}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={topic.isActive ? "default" : "secondary"}>
                    {topic.isActive ? "Active" : "Paused"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteTopic(topic.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Monitoring
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {topic.keywords.include.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {topic.keywords.exclude.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Excluding
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {topic.keywords.exclude.map((kw) => (
                          <Badge
                            key={kw}
                            variant="outline"
                            className="text-xs"
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
