import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, Users, DollarSign, BookOpen, RefreshCw, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ApplyProjectOwner = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Apply to be a Project Owner
          </h1>
          <p className="text-lg text-muted-foreground">
            Help shape DIY content and get rewarded for it.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">What Project Owners do</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Manage content</strong> — Keep project guides accurate, clear, and up to date.</span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Research and stay current</strong> — Follow best practices, codes, and methods so users get reliable guidance.</span>
            </li>
            <li className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Incorporate feedback</strong> — Use ratings and user input to improve projects.</span>
            </li>
            <li className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Apply continuous improvement</strong> — Iterate on steps, timing, and checkpoints so outcomes get better over time.</span>
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Benefits</h2>
          <div className="grid gap-4 sm:grid-cols-1">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Free membership</CardTitle>
                </div>
                <CardDescription>$59/year value — full platform access at no cost.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Community</CardTitle>
                </div>
                <CardDescription>Be part of a community improving DIY for everyone.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Get paid</CardTitle>
                </div>
                <CardDescription>$1 per 4+ star rating at the end of a project.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="text-lg">Why this matters</CardTitle>
            <CardDescription>From the founder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
            <p>
              DIY looks simple from the outside, but once you dig in, it's a genuinely complex engineering problem. Over the last 15 years, YouTube changed the home‑improvement landscape in a massive way—tens of thousands of tutorials, billions of views, and millions of people starting projects they never would have attempted before. It was a real step‑change in access to knowledge.
            </p>
            <p>
              But there's a gap we don't talk about enough: <em>"videos aren't the same as a reliable process."</em>
            </p>
            <p>
              A real process includes skills, the right tools, clear instructions, critical checkpoints, timing, and progress tracking. YouTube gives you one piece of that puzzle—instructions—and leaves the rest to chance. That's why so many homeowners still struggle, stall, or end up calling a pro to redo the work. Studies show that more than a third of DIY projects don't go as planned, and rework costs homeowners billions every year.
            </p>
            <p>
              I'm trying to fix that.
            </p>
            <p>
              My goal is to bring aerospace‑level thinking to DIY—not because installing baseboard requires rocket‑grade precision, but because the average homeowner deserves a system that makes complex work feel doable, safe, and high‑quality. When you give an amateur a structured process, the results get dramatically better. Homes get better. Confidence grows. And people actually finish what they start.
            </p>
            <p>
              But this isn't something AI can solve alone. AI helps, but it's not yet capable of delivering the full, engineered workflow homeowners need. This takes people—builders, designers, engineers, tradespeople, and anyone who cares about making home improvement more accessible.
            </p>
            <p>
              If you want to help build the next chapter of DIY, one where we move from "views and entertainment" to "projects actually done"—I'd love to have you involved.
            </p>
            <p className="font-medium text-foreground">— Zack</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link to="/auth?mode=signup">Create an account</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="mailto:support@toolio.com?subject=Apply%20to%20be%20a%20Project%20Owner">Contact us to apply</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplyProjectOwner;
