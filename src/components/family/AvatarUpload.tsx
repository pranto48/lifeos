import { useRef, useState } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentUrl?: string | null;
  name?: string;
  onUpload: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({ currentUrl, name = '', onUpload, size = 'md' }: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-28 w-28',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('family-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('family-avatars')
        .getPublicUrl(fileName);

      onUpload(urlData.publicUrl);
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl || currentUrl;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="relative cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        <Avatar className={cn(sizeClasses[size], "border-2 border-primary/20")}>
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt={name} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials || <User className={iconSizes[size]} />}
          </AvatarFallback>
        </Avatar>
        
        <div className={cn(
          "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          uploading && "opacity-100"
        )}>
          {uploading ? (
            <Loader2 className={cn(iconSizes[size], "text-white animate-spin")} />
          ) : (
            <Camera className={cn(iconSizes[size], "text-white")} />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {uploading ? 'Uploading...' : 'Click to upload'}
      </span>
    </div>
  );
}
