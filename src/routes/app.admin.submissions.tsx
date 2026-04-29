import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/admin/submissions")({
  component: AdminSubmissionsPage,
});

function AdminSubmissionsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [
        { data: contactsData },
        { data: newsData }
      ] = await Promise.all([
        supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("newsletter_subscriptions").select("*").order("created_at", { ascending: false })
      ]);
      
      if (contactsData) setContacts(contactsData);
      if (newsData) setNewsletters(newsData);
      setLoading(false);
    }
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-[var(--parchment)]">Loading submissions...</div>;
  }

  return (
    <div className="p-8 text-[var(--parchment)]">
      <h1 className="text-3xl font-display font-semibold mb-8 text-[var(--saffron)]">Platform Submissions</h1>
      
      <Tabs defaultValue="contacts">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="contacts" className="data-[state=active]:bg-[var(--saffron)] data-[state=active]:text-[var(--indigo-night)]">Contact Form ({contacts.length})</TabsTrigger>
          <TabsTrigger value="newsletters" className="data-[state=active]:bg-[var(--saffron)] data-[state=active]:text-[var(--indigo-night)]">Newsletter ({newsletters.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts">
          <div className="space-y-4">
            {contacts.map((c) => (
              <div key={c.id} className="p-5 border border-white/10 rounded-xl bg-white/5 shadow-sm">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {c.name} 
                      <span className="text-sm font-normal text-[var(--parchment)]/70 ml-2">({c.email})</span>
                    </h3>
                    <p className="text-xs uppercase tracking-wider text-[var(--saffron)] font-bold mt-1">Role: {c.role} • Source: {c.source}</p>
                  </div>
                  <span className="text-xs text-[var(--parchment)]/60 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 p-4 bg-black/20 rounded-lg whitespace-pre-wrap text-sm text-[var(--parchment)]/90 border border-white/5">
                  {c.message}
                </div>
              </div>
            ))}
            {contacts.length === 0 && <p className="text-[var(--parchment)]/60">No contact submissions yet.</p>}
          </div>
        </TabsContent>
        
        <TabsContent value="newsletters">
          <div className="space-y-2">
            {newsletters.map((n) => (
              <div key={n.id} className="p-4 border border-white/10 rounded-lg bg-white/5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <span className="font-medium text-white">{n.email}</span>
                <span className="text-xs text-[var(--parchment)]/60">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            ))}
            {newsletters.length === 0 && <p className="text-[var(--parchment)]/60">No newsletter subscriptions yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
