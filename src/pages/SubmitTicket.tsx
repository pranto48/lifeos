import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, CheckCircle, Ticket, HardDrive, AppWindow, Wifi, Mail, Printer, UserCog, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
}

interface FormField {
  id: string;
  category_id: string | null;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: { label: string; value: string }[] | null;
  is_required: boolean;
  is_active: boolean;
  placeholder: string | null;
  default_value: string | null;
}

interface Device {
  id: string;
  device_name: string;
  device_number: string | null;
}

const iconMap: Record<string, React.ElementType> = {
  HardDrive,
  AppWindow,
  Wifi,
  Mail,
  Printer,
  UserCog,
  HelpCircle,
  Ticket,
};

export default function SubmitTicket() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const deviceNumber = searchParams.get('device');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [device, setDevice] = useState<Device | null>(null);

  // Form state
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [customFields, setCustomFields] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load categories
        const { data: cats } = await supabase
          .from('ticket_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        setCategories((cats as Category[]) || []);

        // Load form fields
        const { data: fields } = await supabase
          .from('ticket_form_fields')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        const parsedFields = (fields || []).map((f: any) => ({
          ...f,
          field_options: f.field_options
            ? typeof f.field_options === 'string'
              ? JSON.parse(f.field_options)
              : f.field_options
            : null,
        }));
        setFormFields(parsedFields as FormField[]);

        // Load device if specified
        if (deviceNumber) {
          const { data: deviceData } = await supabase
            .from('device_inventory')
            .select('id, device_name, device_number')
            .eq('device_number', deviceNumber.toUpperCase())
            .single();
          if (deviceData) {
            setDevice(deviceData as Device);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [deviceNumber]);

  // Initialize custom fields with default values
  useEffect(() => {
    const defaults: Record<string, string | boolean> = {};
    relevantFields.forEach((field) => {
      if (field.default_value && !customFields[field.field_name]) {
        defaults[field.field_name] = field.field_type === 'checkbox' ? field.default_value === 'true' : field.default_value;
      }
    });
    if (Object.keys(defaults).length > 0) {
      setCustomFields((prev) => ({ ...prev, ...defaults }));
    }
  }, [formFields, selectedCategory]);

  const relevantFields = formFields.filter(
    (f) => f.is_active && (f.category_id === null || f.category_id === selectedCategory)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!requesterEmail || !requesterName || !title || !description || !selectedCategory) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate custom required fields
    for (const field of relevantFields) {
      if (field.is_required && !customFields[field.field_name]) {
        toast({
          title: 'Missing Required Field',
          description: `Please fill in "${field.field_label}"`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Find or create requester
      let requesterId: string;
      const { data: existingRequester } = await supabase
        .from('ticket_requesters')
        .select('id')
        .eq('email', requesterEmail.toLowerCase())
        .single();

      if (existingRequester) {
        requesterId = existingRequester.id;
        // Update name/phone if provided
        await supabase
          .from('ticket_requesters')
          .update({ name: requesterName, phone: requesterPhone || null })
          .eq('id', requesterId);
      } else {
        const { data: newRequester, error: requesterError } = await supabase
          .from('ticket_requesters')
          .insert({
            email: requesterEmail.toLowerCase(),
            name: requesterName,
            phone: requesterPhone || null,
            device_id: device?.id || null,
          })
          .select()
          .single();

        if (requesterError) throw requesterError;
        requesterId = newRequester.id;
      }

      // Create ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert([{
          requester_id: requesterId,
          category_id: selectedCategory,
          device_id: device?.id || null,
          title,
          description,
          priority,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
          ticket_number: 'TMP', // Will be replaced by trigger
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;

      setTicketNumber(newTicket.ticket_number);
      setSubmitted(true);

      toast({
        title: 'Ticket Submitted!',
        description: `Your ticket #${newTicket.ticket_number} has been created.`,
      });
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const value = customFields[field.field_name] || '';

    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || ''}
            value={value as string}
            onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.field_name]: e.target.value }))}
            className="min-h-[80px]"
          />
        );
      case 'select':
        return (
          <Select
            value={value as string}
            onValueChange={(v) => setCustomFields((prev) => ({ ...prev, [field.field_name]: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.field_options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.field_name}
              checked={value as boolean}
              onCheckedChange={(checked) =>
                setCustomFields((prev) => ({ ...prev, [field.field_name]: checked === true }))
              }
            />
            <Label htmlFor={field.field_name} className="font-normal cursor-pointer">
              {field.placeholder || field.field_label}
            </Label>
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value as string}
            onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.field_name]: e.target.value }))}
          />
        );
      default:
        return (
          <Input
            type="text"
            placeholder={field.placeholder || ''}
            value={value as string}
            onChange={(e) => setCustomFields((prev) => ({ ...prev, [field.field_name]: e.target.value }))}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-12 pb-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                  >
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Ticket Submitted Successfully!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your support ticket has been created. Our IT team will review it shortly.
                  </p>
                  <div className="bg-background rounded-lg p-4 inline-block mb-6">
                    <p className="text-sm text-muted-foreground">Ticket Number</p>
                    <p className="text-2xl font-mono font-bold text-primary">{ticketNumber}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false);
                        setTitle('');
                        setDescription('');
                        setCustomFields({});
                      }}
                    >
                      Submit Another Ticket
                    </Button>
                    <Button onClick={() => navigate('/')}>Go to Home</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Ticket className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Submit IT Support Ticket</CardTitle>
                  <CardDescription>
                    Describe your issue and our IT team will assist you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Device Info */}
                    {device && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
                      >
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Linked Device
                        </p>
                        <p className="font-mono">
                          {device.device_number} - {device.device_name}
                        </p>
                      </motion.div>
                    )}

                    {/* Requester Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          Your Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={requesterName}
                          onChange={(e) => setRequesterName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={requesterEmail}
                          onChange={(e) => setRequesterEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Your contact number"
                        value={requesterPhone}
                        onChange={(e) => setRequesterPhone(e.target.value)}
                      />
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                      <Label>
                        Issue Category <span className="text-destructive">*</span>
                      </Label>
                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                        {categories.map((cat) => {
                          const IconComponent = iconMap[cat.icon] || Ticket;
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <motion.button
                              key={cat.id}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <IconComponent
                                className="h-6 w-6 mx-auto mb-1"
                                style={{ color: isSelected ? cat.color : undefined }}
                              />
                              <span className="text-sm font-medium">{cat.name}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        Issue Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="Brief summary of your issue"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, and what you've already tried."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="min-h-[120px]"
                        maxLength={2000}
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low - Can wait a few days</SelectItem>
                          <SelectItem value="medium">Medium - Need help soon</SelectItem>
                          <SelectItem value="high">High - Urgent, affects work</SelectItem>
                          <SelectItem value="critical">Critical - Work is completely blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Fields */}
                    {relevantFields.length > 0 && (
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-medium">Additional Information</h3>
                        {relevantFields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            {field.field_type !== 'checkbox' && (
                              <Label>
                                {field.field_label}
                                {field.is_required && <span className="text-destructive"> *</span>}
                              </Label>
                            )}
                            {renderFormField(field)}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Ticket
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
