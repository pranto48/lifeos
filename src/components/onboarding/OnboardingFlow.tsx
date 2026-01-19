import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  type CarouselApi 
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Target, 
  Wallet,
  Users,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

interface OnboardingSlide {
  icon: React.ReactNode;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: <Sparkles className="w-16 h-16" />,
    titleEn: "Welcome to LifeOS",
    titleBn: "LifeOS-এ স্বাগতম",
    descriptionEn: "Your personal command center for managing life, work, and everything in between.",
    descriptionBn: "জীবন, কাজ এবং মাঝখানের সবকিছু পরিচালনার জন্য আপনার ব্যক্তিগত কমান্ড সেন্টার।",
    color: "from-primary/20 to-primary/5"
  },
  {
    icon: <LayoutDashboard className="w-16 h-16" />,
    titleEn: "Smart Dashboard",
    titleBn: "স্মার্ট ড্যাশবোর্ড",
    descriptionEn: "Get a bird's eye view of your tasks, goals, and upcoming events all in one place.",
    descriptionBn: "একটি জায়গায় আপনার সব কাজ, লক্ষ্য এবং আসন্ন ইভেন্টের সম্পূর্ণ দৃশ্য পান।",
    color: "from-blue-500/20 to-blue-500/5"
  },
  {
    icon: <CheckSquare className="w-16 h-16" />,
    titleEn: "Task Management",
    titleBn: "টাস্ক ম্যানেজমেন্ট",
    descriptionEn: "Create, organize, and track tasks with categories, priorities, and due dates.",
    descriptionBn: "ক্যাটাগরি, অগ্রাধিকার এবং নির্ধারিত তারিখ সহ টাস্ক তৈরি, সংগঠিত এবং ট্র্যাক করুন।",
    color: "from-green-500/20 to-green-500/5"
  },
  {
    icon: <Calendar className="w-16 h-16" />,
    titleEn: "Calendar & Events",
    titleBn: "ক্যালেন্ডার ও ইভেন্ট",
    descriptionEn: "Schedule events, set reminders, and never miss an important date again.",
    descriptionBn: "ইভেন্ট নির্ধারণ করুন, রিমাইন্ডার সেট করুন এবং কোনো গুরুত্বপূর্ণ তারিখ মিস করবেন না।",
    color: "from-purple-500/20 to-purple-500/5"
  },
  {
    icon: <Wallet className="w-16 h-16" />,
    titleEn: "Budget Tracking",
    titleBn: "বাজেট ট্র্যাকিং",
    descriptionEn: "Monitor expenses, set budgets, and take control of your finances.",
    descriptionBn: "খরচ পর্যবেক্ষণ করুন, বাজেট সেট করুন এবং আপনার আর্থিক নিয়ন্ত্রণে রাখুন।",
    color: "from-yellow-500/20 to-yellow-500/5"
  },
  {
    icon: <Target className="w-16 h-16" />,
    titleEn: "Goal Setting",
    titleBn: "লক্ষ্য নির্ধারণ",
    descriptionEn: "Set personal and professional goals, track progress, and celebrate achievements.",
    descriptionBn: "ব্যক্তিগত এবং পেশাদার লক্ষ্য সেট করুন, অগ্রগতি ট্র্যাক করুন এবং সাফল্য উদযাপন করুন।",
    color: "from-orange-500/20 to-orange-500/5"
  },
  {
    icon: <Users className="w-16 h-16" />,
    titleEn: "Ready to Start?",
    titleBn: "শুরু করতে প্রস্তুত?",
    descriptionEn: "Swipe up or tap the button below to begin your productivity journey!",
    descriptionBn: "আপনার উৎপাদনশীলতার যাত্রা শুরু করতে উপরে সোয়াইপ করুন বা নিচের বোতামে ট্যাপ করুন!",
    color: "from-cyan-500/20 to-cyan-500/5"
  }
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { language } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrentIndex(api.selectedScrollSnap());
  }, [api]);

  React.useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onSelect]);

  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      api?.scrollNext();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Skip Button */}
      <div className="absolute top-4 right-4 z-10 safe-area-pt">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5 mr-1" />
          {language === 'bn' ? 'এড়িয়ে যান' : 'Skip'}
        </Button>
      </div>

      {/* Carousel */}
      <div className="flex-1 flex items-center justify-center px-4">
        <Carousel 
          setApi={setApi} 
          className="w-full max-w-lg"
          opts={{
            align: 'center',
            loop: false
          }}
        >
          <CarouselContent>
            {slides.map((slide, index) => (
              <CarouselItem key={index}>
                <motion.div 
                  className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-gradient-to-b ${slide.color} min-h-[400px]`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.div 
                    className="text-primary mb-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {slide.icon}
                  </motion.div>
                  <motion.h2 
                    className="text-2xl font-bold text-foreground mb-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {language === 'bn' ? slide.titleBn : slide.titleEn}
                  </motion.h2>
                  <motion.p 
                    className="text-muted-foreground text-base leading-relaxed"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {language === 'bn' ? slide.descriptionBn : slide.descriptionEn}
                  </motion.p>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 py-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Action Button */}
      <div className="px-6 pb-8 safe-area-pb">
        <Button 
          onClick={handleNext}
          className="w-full h-14 text-lg font-semibold rounded-xl touch-target"
          size="lg"
        >
          {isLastSlide 
            ? (language === 'bn' ? 'শুরু করুন' : 'Get Started')
            : (language === 'bn' ? 'পরবর্তী' : 'Next')
          }
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
