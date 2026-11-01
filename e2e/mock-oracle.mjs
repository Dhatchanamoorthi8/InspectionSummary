// mock-oracle.mjs
// Authoritative In-Memory Reference Oracle Server for Heat Treatment Inspection System
// Strictly implements all interface contracts, domain validation, RBAC, and calculation engines.

import http from 'node:http';
import { URL } from 'node:url';

export function createReferenceServer() {
  // --- In-Memory Database State ---
  let nextId = 1;
  const uid = (prefix = 'id') => `${prefix}-${nextId++}`;

  const state = {
    users: [
      {
        id: 'usr-pe-1',
        username: 'pe_john',
        passwordHash: '$2b$10$hashed_password_placeholder', // bcrypt hashed in real life
        passwordPlain: 'Password123!',
        fullName: 'John Master (PE)',
        role: 'PRODUCTION_ENGINEER',
        canManageUsers: true,
        isActive: true,
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
      {
        id: 'usr-pe-2',
        username: 'pe_mary',
        passwordHash: '$2b$10$hashed_password_placeholder',
        passwordPlain: 'Password123!',
        fullName: 'Mary Engineer (PE)',
        role: 'PRODUCTION_ENGINEER',
        canManageUsers: false,
        isActive: true,
        signatureData: null,
      },
      {
        id: 'usr-qi-1',
        username: 'qi_david',
        passwordHash: '$2b$10$hashed_password_placeholder',
        passwordPlain: 'Password123!',
        fullName: 'David Inspector (QI)',
        role: 'QUALITY_INSPECTOR',
        canManageUsers: false,
        isActive: true,
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
      {
        id: 'usr-qi-2',
        username: 'qi_sarah',
        passwordHash: '$2b$10$hashed_password_placeholder',
        passwordPlain: 'Password123!',
        fullName: 'Sarah Inspector (QI)',
        role: 'QUALITY_INSPECTOR',
        canManageUsers: false,
        isActive: true,
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
      {
        id: 'usr-qi-inactive',
        username: 'qi_inactive',
        passwordHash: '$2b$10$hashed_password_placeholder',
        passwordPlain: 'Password123!',
        fullName: 'Inactive Inspector',
        role: 'QUALITY_INSPECTOR',
        canManageUsers: false,
        isActive: false,
        signatureData: null,
      },
    ],

    parts: [
      { id: 'prt-1', partName: 'Axle Shaft', partNumber: 'AX-1001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'prt-2', partName: 'Axle Shaft', partNumber: 'AX-1002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'prt-3', partName: 'Turbine Blade', partNumber: 'TB-2001', isActive: true, createdAt: new Date().toISOString() },
      { id: 'prt-4', partName: 'Turbine Blade', partNumber: 'TB-2002', isActive: true, createdAt: new Date().toISOString() },
      { id: 'prt-5', partName: 'Turbine Blade', partNumber: 'TB-2003', isActive: true, createdAt: new Date().toISOString() },
      { id: 'prt-6', partName: 'Camshaft', partNumber: 'CS-3001', isActive: true, createdAt: new Date().toISOString() },
    ],

    requests: [],
    reports: [],
    auditLogs: [],
  };

  let reqCounter = 1000;
  function generateRequestNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    reqCounter++;
    return `REQ-${today}-${reqCounter}`;
  }

  function addAudit(userId, username, action, entityType, entityId, previousValue = null, newValue = null) {
    state.auditLogs.unshift({
      id: uid('aud'),
      timestamp: new Date().toISOString(),
      userId,
      username,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
    });
  }

  // --- Auth & JWT simulation ---
  function signToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      canManageUsers: !!user.canManageUsers,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = Buffer.from('mock_signature').toString('base64url');
    return `${header}.${body}.${sig}`;
  }

  function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const expectedSig = Buffer.from('mock_signature').toString('base64url');
    if (parts[2] !== expectedSig) return null;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      if (!payload.id || !state.users.some((u) => u.id === payload.id)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function getUserFromReq(req) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    return verifyToken(token);
  }

  // --- HTTP Request Handler ---
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Helper senders
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const error = (status, message) => {
      json(status, { statusCode: status, message, error: http.STATUS_CODES[status] || 'Error' });
    };

    // Buffer body
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const text = Buffer.concat(buffers).toString();
        if (text) {
          body = JSON.parse(text);
        }
      } catch {
        return error(400, 'Invalid JSON body');
      }
    }

    // ==========================================
    // ROUTE: Health
    // ==========================================
    if (req.method === 'GET' && pathname === '/api/health') {
      return json(200, {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }

    // ==========================================
    // ROUTE: Auth Login & Me & Logout
    // ==========================================
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const { username, password } = body;
      if (!username || !password) return error(400, 'Username and password are required');
      const user = state.users.find((u) => u.username === username);
      if (!user || user.passwordPlain !== password) {
        return error(401, 'Invalid credentials');
      }
      if (!user.isActive) {
        return error(401, 'User account is inactive');
      }
      const token = signToken(user);
      return json(200, {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          canManageUsers: user.canManageUsers,
          isActive: user.isActive,
          signatureData: user.signatureData,
        },
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const user = getUserFromReq(req);
      if (!user) return error(401, 'Unauthorized');
      return json(200, { success: true, message: 'Logged out successfully' });
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const authUser = getUserFromReq(req);
      if (!authUser) return error(401, 'Unauthorized');
      const user = state.users.find((u) => u.id === authUser.id);
      if (!user) return error(404, 'User not found');
      return json(200, {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          canManageUsers: user.canManageUsers,
          isActive: user.isActive,
          signatureData: user.signatureData,
        },
      });
    }

    // All routes below require authentication
    const authUser = getUserFromReq(req);

    // ==========================================
    // ROUTE: Users & Roles & Signatures
    // ==========================================
    if (pathname.startsWith('/api/users')) {
      if (!authUser) return error(401, 'Unauthorized');

      // GET /api/users/inspectors
      if (req.method === 'GET' && pathname === '/api/users/inspectors') {
        const inspectors = state.users
          .filter((u) => u.role === 'QUALITY_INSPECTOR' && u.isActive)
          .map((u) => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role, isActive: true }));
        return json(200, inspectors);
      }

      // GET /api/users
      if (req.method === 'GET' && pathname === '/api/users') {
        if (authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Quality Inspector cannot manage users');
        }
        const safeUsers = state.users.map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          canManageUsers: u.canManageUsers,
          isActive: u.isActive,
          hasSignature: !!u.signatureData,
        }));
        return json(200, safeUsers);
      }

      // POST /api/users
      if (req.method === 'POST' && pathname === '/api/users') {
        if (authUser.role !== 'PRODUCTION_ENGINEER' || !authUser.canManageUsers) {
          return error(403, 'Forbidden: User management permission required');
        }
        const { username, password, fullName, role, canManageUsers, isActive, signatureData } = body;
        if (!username || !password || !fullName || !role) {
          return error(400, 'Missing required user fields');
        }
        if (state.users.some((u) => u.username === username)) {
          return error(409, 'Username already exists');
        }
        const newUser = {
          id: uid('usr'),
          username,
          passwordHash: '$2b$10$hashed_password_mock',
          passwordPlain: password,
          fullName,
          role,
          canManageUsers: !!canManageUsers,
          isActive: isActive !== false,
          signatureData: signatureData || null,
        };
        state.users.push(newUser);
        addAudit(authUser.id, authUser.username, 'CREATE_USER', 'USER', newUser.id, null, { username, role });
        return json(201, {
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
          canManageUsers: newUser.canManageUsers,
          isActive: newUser.isActive,
        });
      }

      // Upload or update signature: PUT /api/users/:id/signature or POST /api/users/:id/signature
      const sigMatch = pathname.match(/^\/api\/users\/([^/]+)\/signature$/);
      if (sigMatch && (req.method === 'PUT' || req.method === 'POST')) {
        const targetUserId = sigMatch[1];
        if (authUser.id !== targetUserId && authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Cannot edit another user signature');
        }
        const user = state.users.find((u) => u.id === targetUserId);
        if (!user) return error(404, 'User not found');
        const { signatureData } = body;
        if (!signatureData) return error(400, 'signatureData is required');
        user.signatureData = signatureData;
        addAudit(authUser.id, authUser.username, 'UPDATE_SIGNATURE', 'USER', user.id);
        return json(200, { success: true, message: 'Signature updated successfully' });
      }

      // PUT /api/users/:id
      const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
      if (userMatch && req.method === 'PUT') {
        if (authUser.role !== 'PRODUCTION_ENGINEER' || !authUser.canManageUsers) {
          return error(403, 'Forbidden: User management permission required');
        }
        const targetUserId = userMatch[1];
        const user = state.users.find((u) => u.id === targetUserId);
        if (!user) return error(404, 'User not found');
        const prev = { ...user };
        if (body.fullName !== undefined) user.fullName = body.fullName;
        if (body.isActive !== undefined) user.isActive = body.isActive;
        if (body.canManageUsers !== undefined) user.canManageUsers = body.canManageUsers;
        if (body.role !== undefined) user.role = body.role;
        addAudit(authUser.id, authUser.username, 'UPDATE_USER', 'USER', user.id, prev, user);
        return json(200, {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          canManageUsers: user.canManageUsers,
          isActive: user.isActive,
        });
      }
    }

    // ==========================================
    // ROUTE: Part Master & Bulk Import
    // ==========================================
    if (pathname.startsWith('/api/parts')) {
      if (!authUser) return error(401, 'Unauthorized');

      // GET /api/parts/template
      if (req.method === 'GET' && pathname === '/api/parts/template') {
        res.writeHead(200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="part_master_template.csv"',
        });
        return res.end('Part Name,Part Number\nAxle Shaft,AX-9001\nCrankshaft,CR-9002\n');
      }

      // GET /api/parts/names
      if (req.method === 'GET' && pathname === '/api/parts/names') {
        const distinctNames = [...new Set(state.parts.filter((p) => p.isActive).map((p) => p.partName))];
        return json(200, distinctNames);
      }

      // GET /api/parts/numbers?partName=...
      if (req.method === 'GET' && pathname === '/api/parts/numbers') {
        const pName = searchParams.get('partName');
        const parts = state.parts.filter((p) => p.isActive && (!pName || p.partName === pName));
        return json(200, parts.map((p) => p.partNumber));
      }

      // POST /api/parts/import/preview
      if (req.method === 'POST' && pathname === '/api/parts/import/preview') {
        if (authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Quality Inspector cannot import parts');
        }
        const { rows } = body;
        if (!Array.isArray(rows)) return error(400, 'Expected rows array');
        const validRows = [];
        const errors = [];
        rows.forEach((row, idx) => {
          const lineNum = idx + 1;
          const partName = row.partName || row['Part Name'];
          const partNumber = row.partNumber || row['Part Number'];
          if (!partName || !partNumber) {
            errors.push({ line: lineNum, message: 'Missing Part Name or Part Number' });
          } else {
            validRows.push({ partName: String(partName).trim(), partNumber: String(partNumber).trim() });
          }
        });
        return json(200, {
          totalRows: rows.length,
          validCount: validRows.length,
          errorCount: errors.length,
          validRows,
          errors,
        });
      }

      // POST /api/parts/import/commit
      if (req.method === 'POST' && pathname === '/api/parts/import/commit') {
        if (authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Quality Inspector cannot commit parts');
        }
        const { validRows } = body;
        if (!Array.isArray(validRows)) return error(400, 'Expected validRows array');
        let imported = 0;
        for (const item of validRows) {
          const exists = state.parts.some(
            (p) => p.partName === item.partName && p.partNumber === item.partNumber
          );
          if (!exists) {
            state.parts.push({
              id: uid('prt'),
              partName: item.partName,
              partNumber: item.partNumber,
              isActive: true,
              createdAt: new Date().toISOString(),
            });
            imported++;
          }
        }
        addAudit(authUser.id, authUser.username, 'BULK_IMPORT_PARTS', 'PART_MASTER', 'BULK', null, { importedCount: imported });
        return json(200, { success: true, importedCount: imported });
      }

      // GET /api/parts
      if (req.method === 'GET' && pathname === '/api/parts') {
        const query = (searchParams.get('search') || '').toLowerCase();
        let list = state.parts;
        if (query) {
          list = list.filter((p) => p.partName.toLowerCase().includes(query) || p.partNumber.toLowerCase().includes(query));
        }
        return json(200, list);
      }

      // POST /api/parts
      if (req.method === 'POST' && pathname === '/api/parts') {
        if (authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Quality Inspector cannot manage parts');
        }
        const { partName, partNumber } = body;
        if (!partName || !partNumber) return error(400, 'partName and partNumber required');
        const existing = state.parts.find((p) => p.partName === partName && p.partNumber === partNumber);
        if (existing) return error(409, 'Part mapping already exists');
        const newPart = {
          id: uid('prt'),
          partName,
          partNumber,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        state.parts.push(newPart);
        addAudit(authUser.id, authUser.username, 'CREATE_PART', 'PART', newPart.id, null, newPart);
        return json(201, newPart);
      }

      // DELETE /api/parts/:id (deactivate)
      const partMatch = pathname.match(/^\/api\/parts\/([^/]+)$/);
      if (partMatch && req.method === 'DELETE') {
        if (authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Quality Inspector cannot manage parts');
        }
        const part = state.parts.find((p) => p.id === partMatch[1]);
        if (!part) return error(404, 'Part not found');
        part.isActive = false;
        addAudit(authUser.id, authUser.username, 'DEACTIVATE_PART', 'PART', part.id);
        return json(200, { success: true, message: 'Part deactivated' });
      }
    }

    // ==========================================
    // ROUTE: Inspection Requests & Lifecycle
    // ==========================================
    if (pathname.startsWith('/api/requests')) {
      if (!authUser) return error(401, 'Unauthorized');

      // GET /api/requests
      if (req.method === 'GET' && pathname === '/api/requests') {
        let results = [...state.requests];
        // Quality Inspector sees only tasks assigned to them
        if (authUser.role === 'QUALITY_INSPECTOR') {
          results = results.filter((r) => r.assignedInspectorId === authUser.id);
        }

        // Multi-filters
        const statusFilter = searchParams.get('status');
        if (statusFilter) results = results.filter((r) => r.status === statusFilter);

        const partNameFilter = searchParams.get('partName');
        if (partNameFilter) results = results.filter((r) => r.partName === partNameFilter);

        const inspectorFilter = searchParams.get('inspectorId');
        if (inspectorFilter) results = results.filter((r) => r.assignedInspectorId === inspectorFilter);

        const reportResultFilter = searchParams.get('reportResult');
        if (reportResultFilter) {
          results = results.filter((r) => {
            const rep = state.reports.find((rp) => rp.requestId === r.id);
            return rep && rep.overallStatus === reportResultFilter;
          });
        }

        return json(200, results);
      }

      // POST /api/requests
      if (req.method === 'POST' && pathname === '/api/requests') {
        if (authUser.role !== 'PRODUCTION_ENGINEER') {
          return error(403, 'Forbidden: Quality Inspector cannot create inspection requests');
        }
        const { partName, partNumber, assignedInspectorId, remarks } = body;
        if (!partName || !partNumber) {
          return error(400, 'Part Name and Part Number are required');
        }
        const partMatch = state.parts.find((p) => p.partName === partName && p.partNumber === partNumber && p.isActive);
        if (!partMatch) {
          return error(400, 'Selected Part Name and Part Number do not match active master data');
        }
        let inspector = null;
        if (assignedInspectorId) {
          inspector = state.users.find((u) => u.id === assignedInspectorId && u.role === 'QUALITY_INSPECTOR' && u.isActive);
          if (!inspector) return error(400, 'Assigned inspector is invalid or inactive');
        }

        const newReq = {
          id: uid('req'),
          requestNumber: generateRequestNumber(),
          date: new Date().toISOString().slice(0, 10),
          partName,
          partNumber,
          assignedInspectorId: inspector ? inspector.id : null,
          assignedInspectorName: inspector ? inspector.fullName : null,
          status: inspector ? 'Assigned' : 'Draft',
          remarks: remarks || '',
          createdBy: authUser.id,
          createdAt: new Date().toISOString(),
          assignmentHistory: inspector
            ? [{ assignedInspectorId: inspector.id, assignedInspectorName: inspector.fullName, assignedAt: new Date().toISOString(), assignedBy: authUser.username }]
            : [],
        };
        state.requests.unshift(newReq);
        addAudit(authUser.id, authUser.username, 'CREATE_REQUEST', 'REQUEST', newReq.id, null, newReq);
        return json(201, newReq);
      }

      // Detail, Assign, Start, Cancel
      const reqIdMatch = pathname.match(/^\/api\/requests\/([^/]+)(\/(.*))?$/);
      if (reqIdMatch) {
        const requestId = reqIdMatch[1];
        const subAction = reqIdMatch[3];
        const targetReq = state.requests.find((r) => r.id === requestId);
        if (!targetReq) return error(404, 'Inspection request not found');

        // GET /api/requests/:id
        if (req.method === 'GET' && !subAction) {
          if (authUser.role === 'QUALITY_INSPECTOR' && targetReq.assignedInspectorId !== authUser.id) {
            return error(403, 'Forbidden: Cannot access another inspector task');
          }
          const rep = state.reports.find((rp) => rp.requestId === targetReq.id);
          return json(200, {
            ...targetReq,
            report: rep || null,
          });
        }

        // PATCH /api/requests/:id/assign or PUT /api/requests/:id/reassign
        if ((req.method === 'PATCH' || req.method === 'PUT') && (subAction === 'assign' || subAction === 'reassign')) {
          if (authUser.role !== 'PRODUCTION_ENGINEER') {
            return error(403, 'Forbidden: Quality Inspector cannot assign or reassign requests');
          }
          const { inspectorId, reason } = body;
          const newInsp = state.users.find((u) => u.id === inspectorId && u.role === 'QUALITY_INSPECTOR' && u.isActive);
          if (!newInsp) return error(400, 'Invalid or inactive inspector');

          const prev = { assignedInspectorId: targetReq.assignedInspectorId, assignedInspectorName: targetReq.assignedInspectorName };
          targetReq.assignedInspectorId = newInsp.id;
          targetReq.assignedInspectorName = newInsp.fullName;
          targetReq.status = 'Assigned';
          targetReq.assignmentHistory.push({
            assignedInspectorId: newInsp.id,
            assignedInspectorName: newInsp.fullName,
            assignedAt: new Date().toISOString(),
            assignedBy: authUser.username,
            reason: reason || 'Reassigned',
          });
          addAudit(authUser.id, authUser.username, 'REASSIGN_REQUEST', 'REQUEST', targetReq.id, prev, { assignedInspectorId: newInsp.id, reason });
          return json(200, targetReq);
        }

        // PATCH /api/requests/:id/start
        if (req.method === 'PATCH' && subAction === 'start') {
          if (authUser.role !== 'QUALITY_INSPECTOR') {
            return error(403, 'Forbidden: Only Quality Inspector can start an inspection task');
          }
          if (targetReq.assignedInspectorId !== authUser.id) {
            return error(403, 'Forbidden: Cannot start another inspector task');
          }
          targetReq.status = 'In Progress';
          addAudit(authUser.id, authUser.username, 'START_INSPECTION', 'REQUEST', targetReq.id);
          return json(200, targetReq);
        }

        // PATCH /api/requests/:id/cancel
        if (req.method === 'PATCH' && subAction === 'cancel') {
          if (authUser.role !== 'PRODUCTION_ENGINEER') {
            return error(403, 'Forbidden: Quality Inspector cannot cancel requests');
          }
          targetReq.status = 'Cancelled';
          addAudit(authUser.id, authUser.username, 'CANCEL_REQUEST', 'REQUEST', targetReq.id);
          return json(200, targetReq);
        }
      }
    }

    // ==========================================
    // ROUTE: Inspection Reports & Calculation Engine
    // ==========================================
    if (pathname.startsWith('/api/reports')) {
      if (!authUser) return error(401, 'Unauthorized');

      // POST /api/reports
      if (req.method === 'POST' && pathname === '/api/reports') {
        if (authUser.role !== 'QUALITY_INSPECTOR') {
          return error(403, 'Forbidden: Production Engineer cannot submit inspection reports');
        }

        const {
          requestId,
          reportDate,
          heatBatchNumber,
          furnace,
          autoReport,
          sampleBatchDate,
          bhn,
          ys,
          uts,
          elongation,
          inspectorRemarks,
        } = body;

        if (!requestId || !heatBatchNumber || !furnace || !autoReport || !sampleBatchDate) {
          return error(400, 'Missing required report fields');
        }

        const targetReq = state.requests.find((r) => r.id === requestId);
        if (!targetReq) return error(404, 'Inspection request not found');

        // Ownership enforcement: assigned inspector only
        if (targetReq.assignedInspectorId !== authUser.id) {
          return error(403, 'Forbidden: Cannot submit report for another inspector task');
        }

        // Transactional duplicate submission prevention
        if (state.reports.some((rp) => rp.requestId === requestId)) {
          return error(409, 'Conflict: Duplicate report submission is not permitted');
        }

        // Numerical validation (non-negative decimals)
        const numBhn = Number(bhn);
        const numYs = Number(ys);
        const numUts = Number(uts);
        const numE = Number(elongation);

        if (
          !Number.isFinite(numBhn) ||
          !Number.isFinite(numYs) ||
          !Number.isFinite(numUts) ||
          !Number.isFinite(numE)
        ) {
          return error(400, 'BHN, YS, UTS, and Elongation must be valid finite numbers');
        }

        if (numBhn < 0 || numYs < 0 || numUts < 0 || numE < 0) {
          return error(400, 'Negative values are rejected for mechanical/hardness measurements');
        }

        if (numBhn > 3000 || numYs > 5000 || numUts > 5000 || numE > 100) {
          return error(400, 'Measurement values exceed physical limits for heat treatment testing');
        }

        // Date validation
        if (isNaN(Date.parse(sampleBatchDate)) || (reportDate && isNaN(Date.parse(reportDate)))) {
          return error(400, 'Invalid date format');
        }

        // Authoritative Metallurgical Calculation Engine
        // Hardness validation: BHN >= 80 -> OK, < 80 -> NOT_OK
        const hardnessStatus = numBhn >= 80 ? 'OK' : 'NOT_OK';

        // Mechanical validation: YS >= 220, UTS >= 280, E >= 1.00 -> OK, else NOT_OK
        const mechanicalStatus = numYs >= 220 && numUts >= 280 && numE >= 1.0 ? 'OK' : 'NOT_OK';

        // Overall status: OK iff both OK
        const overallStatus = hardnessStatus === 'OK' && mechanicalStatus === 'OK' ? 'OK' : 'NOT_OK';

        // Remarks invariant: required if Overall Status is NOT_OK
        if (overallStatus === 'NOT_OK' && (!inspectorRemarks || !inspectorRemarks.trim())) {
          return error(400, 'Inspector Remarks required when Overall Status is Not OK');
        }

        // Fetch inspector signature snapshot
        const inspectorUser = state.users.find((u) => u.id === authUser.id);
        const signatureSnapshot = inspectorUser?.signatureData || 'data:image/png;base64,mock_snapshot';

        const newReport = {
          id: uid('rep'),
          requestId: targetReq.id,
          requestNumber: targetReq.requestNumber,
          partName: targetReq.partName,
          partNumber: targetReq.partNumber,
          reportDate: reportDate || new Date().toISOString().slice(0, 10),
          heatBatchNumber,
          furnace,
          autoReport,
          sampleBatchDate,
          bhn: numBhn,
          ys: numYs,
          uts: numUts,
          elongation: numE,
          hardnessStatus, // Calculated, client payload stripped
          mechanicalStatus, // Calculated, client payload stripped
          overallStatus, // Calculated, client payload stripped
          inspectorRemarks: inspectorRemarks || '',
          inspectorId: authUser.id,
          inspectorName: authUser.fullName,
          inspectorSignatureSnapshot: signatureSnapshot,
          submissionTimestamp: new Date().toISOString(),
          revisions: [],
        };

        state.reports.push(newReport);
        targetReq.status = 'Completed';
        addAudit(authUser.id, authUser.username, 'SUBMIT_REPORT', 'REPORT', newReport.id, null, {
          overallStatus,
          hardnessStatus,
          mechanicalStatus,
        });

        return json(201, newReport);
      }

      // Report detail, PDF, Revisions
      const repMatch = pathname.match(/^\/api\/reports\/([^/]+)(\/(.*))?$/);
      if (repMatch) {
        const reportId = repMatch[1];
        const subAction = repMatch[3];
        const rep = state.reports.find((r) => r.id === reportId || r.requestId === reportId);
        if (!rep) return error(404, 'Inspection report not found');

        // GET /api/reports/:id/pdf
        if (req.method === 'GET' && subAction === 'pdf') {
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="report_${rep.requestNumber}.pdf"`,
          });
          return res.end(`%PDF-1.4\n1 0 obj\n<< /Title (Heat Treatment Report ${rep.requestNumber}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);
        }

        // POST /api/reports/:id/revisions
        if (req.method === 'POST' && subAction === 'revisions') {
          const { bhn, ys, uts, elongation, inspectorRemarks, reason } = body;
          if (!reason || !reason.trim()) {
            return error(400, 'Revision reason is required');
          }
          const numBhn = bhn !== undefined ? Number(bhn) : rep.bhn;
          const numYs = ys !== undefined ? Number(ys) : rep.ys;
          const numUts = uts !== undefined ? Number(uts) : rep.uts;
          const numE = elongation !== undefined ? Number(elongation) : rep.elongation;

          const hardnessStatus = numBhn >= 80 ? 'OK' : 'NOT_OK';
          const mechanicalStatus = numYs >= 220 && numUts >= 280 && numE >= 1.0 ? 'OK' : 'NOT_OK';
          const overallStatus = hardnessStatus === 'OK' && mechanicalStatus === 'OK' ? 'OK' : 'NOT_OK';

          const previousSnapshot = { ...rep };
          delete previousSnapshot.revisions;

          const revisionRecord = {
            revisionNumber: rep.revisions.length + 1,
            revisedBy: authUser.username,
            revisedAt: new Date().toISOString(),
            reason,
            previousSnapshot,
          };

          rep.revisions.push(revisionRecord);
          rep.bhn = numBhn;
          rep.ys = numYs;
          rep.uts = numUts;
          rep.elongation = numE;
          rep.hardnessStatus = hardnessStatus;
          rep.mechanicalStatus = mechanicalStatus;
          rep.overallStatus = overallStatus;
          if (inspectorRemarks !== undefined) rep.inspectorRemarks = inspectorRemarks;

          addAudit(authUser.id, authUser.username, 'REVISE_REPORT', 'REPORT', rep.id, previousSnapshot, { revisionNumber: revisionRecord.revisionNumber, reason });
          return json(200, rep);
        }

        // GET /api/reports/:id
        if (req.method === 'GET' && !subAction) {
          return json(200, rep);
        }
      }
    }

    // ==========================================
    // ROUTE: Dashboards & Analytics
    // ==========================================
    if (pathname.startsWith('/api/dashboard')) {
      if (!authUser) return error(401, 'Unauthorized');

      // GET /api/dashboard/production
      if (req.method === 'GET' && pathname === '/api/dashboard/production') {
        const totalRequests = state.requests.length;
        const draft = state.requests.filter((r) => r.status === 'Draft').length;
        const assigned = state.requests.filter((r) => r.status === 'Assigned').length;
        const inProgress = state.requests.filter((r) => r.status === 'In Progress').length;
        const completed = state.requests.filter((r) => r.status === 'Completed').length;
        const pending = assigned + inProgress;
        const notOkReports = state.reports.filter((rp) => rp.overallStatus === 'NOT_OK').length;
        const okReports = state.reports.filter((rp) => rp.overallStatus === 'OK').length;

        const last5Completed = state.requests
          .filter((r) => r.status === 'Completed')
          .slice(0, 5)
          .map((r) => {
            const rep = state.reports.find((rp) => rp.requestId === r.id);
            return {
              requestId: r.id,
              requestNumber: r.requestNumber,
              date: r.date,
              partName: r.partName,
              partNumber: r.partNumber,
              assignedInspector: r.assignedInspectorName,
              overallStatus: rep ? rep.overallStatus : 'UNKNOWN',
            };
          });

        return json(200, {
          kpi: {
            totalRequests,
            draft,
            assigned,
            inProgress,
            completed,
            pending,
            notOkReports,
          },
          requestsByStatus: [
            { status: 'Draft', count: draft },
            { status: 'Assigned', count: assigned },
            { status: 'In Progress', count: inProgress },
            { status: 'Completed', count: completed },
          ],
          distribution: [
            { name: 'OK', count: okReports },
            { name: 'Not OK', count: notOkReports },
            { name: 'Pending', count: pending },
          ],
          last5Completed,
        });
      }

      // GET /api/dashboard/inspector
      if (req.method === 'GET' && pathname === '/api/dashboard/inspector') {
        const myRequests = state.requests.filter((r) => r.assignedInspectorId === authUser.id);
        const totalAssigned = myRequests.length;
        const pending = myRequests.filter((r) => r.status === 'Assigned').length;
        const inProgress = myRequests.filter((r) => r.status === 'In Progress').length;
        const completed = myRequests.filter((r) => r.status === 'Completed').length;
        const myReports = state.reports.filter((rp) => rp.inspectorId === authUser.id);
        const notOkReports = myReports.filter((rp) => rp.overallStatus === 'NOT_OK').length;
        const okReports = myReports.filter((rp) => rp.overallStatus === 'OK').length;

        const nextPendingTask = myRequests.find((r) => r.status === 'Assigned' || r.status === 'In Progress') || null;

        return json(200, {
          kpi: {
            totalAssigned,
            pending,
            inProgress,
            completed,
            notOkReports,
          },
          requestsByStatus: [
            { status: 'Assigned', count: pending },
            { status: 'In Progress', count: inProgress },
            { status: 'Completed', count: completed },
          ],
          distribution: [
            { name: 'OK', count: okReports },
            { name: 'Not OK', count: notOkReports },
            { name: 'Pending', count: pending + inProgress },
          ],
          recentAssignedTasks: myRequests.slice(0, 5),
          nextPendingTask,
        });
      }
    }

    // ==========================================
    // ROUTE: Audit Logs
    // ==========================================
    if (pathname === '/api/audit' && req.method === 'GET') {
      if (!authUser) return error(401, 'Unauthorized');
      let list = [...state.auditLogs];
      const entityType = searchParams.get('entityType');
      if (entityType) list = list.filter((a) => a.entityType === entityType);
      const entityId = searchParams.get('entityId');
      if (entityId) list = list.filter((a) => a.entityId === entityId);
      const userId = searchParams.get('userId');
      if (userId) list = list.filter((a) => a.userId === userId);
      return json(200, list);
    }

    // Default 404
    return error(404, `Route ${req.method} ${pathname} not found`);
  });

  return server;
}
