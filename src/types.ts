export interface User {
  id: number;
  name: string;
  email: string;
  role: 'vet' | 'head';
  specialty: 'GP' | 'Specialist' | 'None';
  branch?: string;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  userName: string;
  userSpecialty: string;
  userBranch: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  substituteId: number | null;
  substituteName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminComment: string | null;
  createdAt: string;
}
