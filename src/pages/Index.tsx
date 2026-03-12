import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, CreditCard, ClipboardList, Users, Shield, ArrowRight } from 'lucide-react';
import hfiLogo from '@/assets/hfi-logo.png';

const Index = () => {
  const features = [
    { icon: Users, title: 'Student Management', description: 'Register and manage student records efficiently' },
    { icon: ClipboardList, title: 'Results & GPA', description: 'Enter marks and auto-calculate grades and GPA' },
    { icon: CreditCard, title: 'Fee Payments', description: 'Track payments and generate receipts' },
    { icon: Shield, title: 'Role-Based Access', description: 'Secure access for students, tutors, finance & admin' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={hfiLogo} alt="HFI Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-lg">HFI SIMS</h1>
              <p className="text-xs text-muted-foreground">Vocational Training Institute</p>
            </div>
          </div>
          <Link to="/auth">
            <Button>Login <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <GraduationCap className="w-4 h-4" />
            Salem Uganda Institution Management System
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
            Manage Your Institution<br />
            <span className="text-primary">Efficiently & Securely</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Track student payments, manage academic results, calculate GPA automatically, 
            and give tutors and administrators full control over the system.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="h-12 px-8">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div key={index} className="p-6 rounded-xl bg-card border shadow-soft hover:shadow-card transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Salem Uganda. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
