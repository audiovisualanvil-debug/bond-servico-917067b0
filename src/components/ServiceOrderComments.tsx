import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { typedFrom } from '@/integrations/supabase/helpers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  service_order_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profile?: { name: string; company: string | null } | null;
}

interface ServiceOrderCommentsProps {
  serviceOrderId: string;
}

export function ServiceOrderComments({ serviceOrderId }: ServiceOrderCommentsProps) {
  const { user, role } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchComments = async () => {
    try {
      const { data, error } = await typedFrom('service_order_comments')
        .select('*, profile:profiles!service_order_comments_author_id_fkey(name, company)')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });

      if (error) {
        // If foreign key doesn't exist, try without join
        const { data: fallbackData, error: fallbackError } = await typedFrom('service_order_comments')
          .select('*')
          .eq('service_order_id', serviceOrderId)
          .order('created_at', { ascending: true });
        
        if (fallbackError) throw fallbackError;
        setComments((fallbackData || []) as Comment[]);
      } else {
        setComments((data || []) as Comment[]);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    // Realtime subscription
    const channel = supabase
      .channel(`comments-${serviceOrderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_order_comments',
        filter: `service_order_id=eq.${serviceOrderId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [serviceOrderId]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setIsSending(true);
    try {
      const { error } = await typedFrom('service_order_comments')
        .insert({
          service_order_id: serviceOrderId,
          author_id: user.id,
          content: message.trim(),
        });

      if (error) throw error;
      setMessage('');
      toast.success('Comentário adicionado');
      fetchComments();
    } catch (err: any) {
      toast.error('Erro ao enviar comentário', { description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const canComment = role === 'admin' || role === 'tecnico';

  return (
    <div className="os-card">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Comentários Internos</h2>
        {comments.length > 0 && (
          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{comments.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum comentário ainda</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className={`p-3 rounded-lg text-sm ${
              comment.author_id === user?.id ? 'bg-primary/5 border border-primary/10' : 'bg-secondary/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">
                  {comment.profile?.name || 'Usuário'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {canComment && (
        <div className="space-y-3 pt-3 border-t border-border">
          <Textarea
            placeholder="Escreva um comentário..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              className="ml-auto"
            >
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
