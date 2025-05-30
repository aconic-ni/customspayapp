"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateWelcomeMessage, type GenerateWelcomeMessageInput } from "@/ai/flows/generate-welcome-message";
import { Loader2, Wand2, Sparkles, PlayCircle, BarChart3, User, FileText, Palette } from "lucide-react";

const formSchema = z.object({
  userName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, {message: "Name must be less than 50 characters."}),
  userProfile: z.string().min(10, { message: "Profile must be at least 10 characters." }).max(500, {message: "Profile must be less than 500 characters."}),
  messagePreferences: z.enum(["formal", "informal", "humorous"], {
    required_error: "You need to select a message tone.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function HomePage() {
  const [welcomeMessage, setWelcomeMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userName: "",
      userProfile: "",
      messagePreferences: undefined,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setWelcomeMessage(null);
    try {
      const aiInput: GenerateWelcomeMessageInput = {
        userName: data.userName,
        userProfile: data.userProfile,
        messagePreferences: data.messagePreferences,
      };
      const result = await generateWelcomeMessage(aiInput);
      setWelcomeMessage(result.welcomeMessage);
      toast({
        title: "Message Generated!",
        description: "Your personalized welcome message is ready.",
      });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem generating your message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 py-8 selection:bg-primary/20 selection:text-primary-foreground">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-primary flex items-center justify-center">
          <Wand2 className="mr-3 h-12 w-12" />
          Welcomatic
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Crafting the perfect welcome, just for you.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-xl rounded-lg overflow-hidden  border-primary/20">
            <CardHeader className="bg-gradient-to-br from-primary/10 via-background to-background">
              <CardTitle className="flex items-center text-2xl font-semibold">
                <Wand2 className="mr-2 h-6 w-6 text-primary" />
                Create Your Personalized Welcome
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Fill in your details and preferences, and let our AI craft a unique welcome message for you.
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form id="welcome-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
                <CardContent className="space-y-6 pt-6">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-md">
                          <User className="mr-2 h-4 w-4 text-primary" /> User Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Jane Doe" {...field} className="text-base"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userProfile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-md">
                          <FileText className="mr-2 h-4 w-4 text-primary" /> User Profile
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., A new user interested in learning about our features. Enjoys casual communication."
                            {...field}
                            rows={4}
                            className="text-base"
                          />
                        </FormControl>
                        <FormDescription>
                          Describe the user or their interests briefly.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="messagePreferences"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="flex items-center text-md">
                          <Palette className="mr-2 h-4 w-4 text-primary" /> Message Tone
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="formal" />
                              </FormControl>
                              <FormLabel className="font-normal text-base">Formal</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="informal" />
                              </FormControl>
                              <FormLabel className="font-normal text-base">Informal</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="humorous" />
                              </FormControl>
                              <FormLabel className="font-normal text-base">Humorous</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="bg-muted/30 py-4 px-6">
                  <Button type="submit" size="lg" className="font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Message"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          {welcomeMessage && (
            <Card className="shadow-xl rounded-lg overflow-hidden animate-in fade-in-50 duration-500 border-accent/30">
              <CardHeader className="bg-gradient-to-br from-accent/10 via-background to-background">
                <CardTitle className="flex items-center text-2xl font-semibold">
                  <Sparkles className="mr-2 h-6 w-6 text-accent" />
                  Here's Your Welcome!
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-lg whitespace-pre-wrap leading-relaxed text-foreground/90">{welcomeMessage}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-8">
          <Card className="shadow-lg rounded-lg overflow-hidden border-primary/20">
            <CardHeader className="bg-primary/10">
              <CardTitle className="flex items-center text-xl font-semibold">
                <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                Featured Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h4 className="font-semibold mb-2 text-md text-primary-foreground bg-primary/80 px-3 py-1 rounded-t-md inline-block">Short Video Greeting</h4>
                <div className="aspect-video bg-muted rounded-b-md rounded-tr-md overflow-hidden shadow-inner">
                  <Image src="https://placehold.co/600x338.png" alt="Video placeholder" width={600} height={338} className="object-cover w-full h-full" data-ai-hint="abstract animation" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-md text-accent-foreground bg-accent/80 px-3 py-1 rounded-t-md inline-block">Animated Welcome</h4>
                <div className="aspect-square bg-muted rounded-b-md rounded-tr-md overflow-hidden shadow-inner">
                  <Image src="https://placehold.co/400x400.png" alt="Animation placeholder" width={400} height={400} className="object-cover w-full h-full" data-ai-hint="friendly robot" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-lg bg-accent/10 border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center text-lg font-semibold text-accent-foreground/90">
                <BarChart3 className="mr-2 h-5 w-5" />
                Experience Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-accent-foreground/80">
                We're always improving! A/B testing helps us find the best welcome messages for users like you.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
