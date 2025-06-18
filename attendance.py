from flask import Blueprint, jsonify, request
from src.models.user import Student, AttendanceSession, Attendance, User, db
from datetime import datetime, date, time
import ipaddress

attendance_bp = Blueprint('attendance', __name__)

# Student routes
@attendance_bp.route('/students', methods=['GET'])
def get_students():
    students = Student.query.all()
    return jsonify([student.to_dict() for student in students])

@attendance_bp.route('/students', methods=['POST'])
def create_student():
    data = request.json
    
    # Check if student already exists
    existing_student = Student.query.filter_by(name=data['name']).first()
    if existing_student:
        return jsonify({'error': 'Bu isimde bir öğrenci zaten kayıtlı'}), 400
    
    student = Student(
        student_number=data.get('student_number', ''),
        name=data['name'],
        email=data.get('email', '')
    )
    db.session.add(student)
    db.session.commit()
    return jsonify(student.to_dict()), 201

@attendance_bp.route('/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify(student.to_dict())

# Attendance Session routes
@attendance_bp.route('/sessions', methods=['GET'])
def get_sessions():
    sessions = AttendanceSession.query.order_by(AttendanceSession.session_date.desc()).all()
    return jsonify([session.to_dict() for session in sessions])

@attendance_bp.route('/sessions', methods=['POST'])
def create_session():
    data = request.json
    
    session_date = datetime.strptime(data['session_date'], '%Y-%m-%d').date()
    start_time = datetime.strptime(data['start_time'], '%H:%M').time()
    end_time = datetime.strptime(data['end_time'], '%H:%M').time()
    
    session = AttendanceSession(
        session_date=session_date,
        start_time=start_time,
        end_time=end_time,
        is_active=data.get('is_active', False)
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201

@attendance_bp.route('/sessions/<int:session_id>/activate', methods=['POST'])
def activate_session(session_id):
    # Deactivate all other sessions
    AttendanceSession.query.update({'is_active': False})
    
    # Activate the specified session
    session = AttendanceSession.query.get_or_404(session_id)
    session.is_active = True
    db.session.commit()
    
    return jsonify(session.to_dict())

@attendance_bp.route('/sessions/<int:session_id>/deactivate', methods=['POST'])
def deactivate_session(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    session.is_active = False
    db.session.commit()
    
    return jsonify(session.to_dict())

@attendance_bp.route('/sessions/active', methods=['GET'])
def get_active_session():
    session = AttendanceSession.query.filter_by(is_active=True).first()
    if session:
        return jsonify(session.to_dict())
    return jsonify({'error': 'No active session'}), 404

# Attendance routes
@attendance_bp.route('/attendance', methods=['POST'])
def mark_attendance():
    data = request.json
    
    # REMOVED TIME RESTRICTION - Allow attendance anytime for testing
    # Get active session or create one if none exists
    active_session = AttendanceSession.query.filter_by(is_active=True).first()
    
    # If no active session, create a default one for testing
    if not active_session:
        today = date.today()
        default_session = AttendanceSession(
            session_date=today,
            start_time=time(8, 25),  # 08:25
            end_time=time(9, 5),     # 09:05
            is_active=True
        )
        db.session.add(default_session)
        db.session.commit()
        active_session = default_session
    
    # Find or create student by name
    student = Student.query.filter_by(name=data['name']).first()
    if not student:
        # Create new student with name only
        student = Student(
            student_number='',
            name=data['name'],
            email=''
        )
        db.session.add(student)
        db.session.commit()
    
    # Check if student already marked attendance for this session
    existing_attendance = Attendance.query.filter_by(
        student_id=student.id,
        session_id=active_session.id
    ).first()
    
    if existing_attendance:
        return jsonify({'error': 'Bu oturum için zaten yoklama verilmiş'}), 400
    
    # Get client IP and user agent
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
    user_agent = request.headers.get('User-Agent', '')
    
    # Create attendance record
    attendance = Attendance(
        student_id=student.id,
        session_id=active_session.id,
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    db.session.add(attendance)
    db.session.commit()
    
    return jsonify({
        'message': 'Yoklama başarıyla kaydedildi',
        'attendance': attendance.to_dict()
    }), 201

@attendance_bp.route('/attendance/session/<int:session_id>', methods=['GET'])
def get_session_attendance(session_id):
    attendances = Attendance.query.filter_by(session_id=session_id).all()
    return jsonify([attendance.to_dict() for attendance in attendances])

@attendance_bp.route('/attendance/student/<int:student_id>', methods=['GET'])
def get_student_attendance(student_id):
    attendances = Attendance.query.filter_by(student_id=student_id).all()
    return jsonify([attendance.to_dict() for attendance in attendances])

# Statistics routes
@attendance_bp.route('/stats/session/<int:session_id>', methods=['GET'])
def get_session_stats(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    total_students = Student.query.count()
    present_students = Attendance.query.filter_by(session_id=session_id).count()
    
    return jsonify({
        'session': session.to_dict(),
        'total_students': total_students,
        'present_students': present_students,
        'attendance_rate': (present_students / total_students * 100) if total_students > 0 else 0
    })

@attendance_bp.route('/stats/overall', methods=['GET'])
def get_overall_stats():
    total_students = Student.query.count()
    total_sessions = AttendanceSession.query.count()
    total_attendances = Attendance.query.count()
    
    return jsonify({
        'total_students': total_students,
        'total_sessions': total_sessions,
        'total_attendances': total_attendances,
        'average_attendance_rate': (total_attendances / (total_students * total_sessions) * 100) if (total_students > 0 and total_sessions > 0) else 0
    })

# Admin authentication routes
@attendance_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Simple hardcoded admin credentials for demo
    if username == 'admin' and password == 'admin123':
        return jsonify({'message': 'Giriş başarılı', 'token': 'admin_token'}), 200
    else:
        return jsonify({'error': 'Kullanıcı adı veya şifre hatalı'}), 401

@attendance_bp.route('/admin/daily-list', methods=['GET'])
def get_daily_attendance_list():
    # Get today's date
    today = date.today()
    
    # Find today's session
    today_session = AttendanceSession.query.filter_by(session_date=today).first()
    
    if not today_session:
        return jsonify({'message': 'Bugün için oturum bulunamadı', 'attendances': []}), 200
    
    # Get attendances for today's session
    attendances = Attendance.query.filter_by(session_id=today_session.id).all()
    
    return jsonify({
        'session': today_session.to_dict(),
        'attendances': [attendance.to_dict() for attendance in attendances],
        'total_count': len(attendances)
    })

