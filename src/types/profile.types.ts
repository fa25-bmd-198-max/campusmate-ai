export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  university: string | null
  department: string | null
  degree: string | null
  semester: number | null
  bio: string | null
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | null
  study_hours_per_day: number | null
  weekly_availability: Record<string, number[]> | null
  academic_goals: string[]
  skills: string[]
  weak_subjects: string[]
  interests: string[]
  is_admin: boolean
  privacy_public: boolean
  show_in_matching: boolean
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  user_id: string
  name: string
  code: string | null
  instructor: string | null
  created_at: string
}

export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic'

export interface OnboardingData {
  full_name: string
  university: string
  department: string
  degree: string
  semester: number
  bio: string
  learning_style: LearningStyle
  study_hours_per_day: number
  weekly_availability: Record<string, number[]>
  academic_goals: string[]
  skills: string[]
  weak_subjects: string[]
  interests: string[]
}
