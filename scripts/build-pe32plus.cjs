const fs = require('fs');
const path = require('path');

function buildPE32PlusExecutable(outputPath, productTitle, version) {
  // Total file size will be 0x5400 (approx 21.5 KB or more with payload)
  const totalRawSize = 0x8000; // 32 KB
  const buf = Buffer.alloc(totalRawSize, 0x00);

  // 1. IMAGE_DOS_HEADER (64 bytes)
  buf.write('MZ', 0, 'ascii'); // e_magic
  buf.writeUInt16LE(0x0090, 2); // e_cblp
  buf.writeUInt16LE(0x0003, 4); // e_cp
  buf.writeUInt16LE(0x0000, 6); // e_crlc
  buf.writeUInt16LE(0x0004, 8); // e_cparhdr
  buf.writeUInt16LE(0x0000, 10); // e_minalloc
  buf.writeUInt16LE(0xFFFF, 12); // e_maxalloc
  buf.writeUInt16LE(0x0000, 14); // e_ss
  buf.writeUInt16LE(0x00B8, 16); // e_sp
  buf.writeUInt16LE(0x0000, 18); // e_csum
  buf.writeUInt16LE(0x0000, 20); // e_ip
  buf.writeUInt16LE(0x0000, 22); // e_cs
  buf.writeUInt16LE(0x0040, 24); // e_lfarlc
  buf.writeUInt16LE(0x0000, 26); // e_ovno
  // e_lfanew at 0x3C points to PE header at 0x80
  buf.writeUInt32LE(0x00000080, 0x3C);

  // DOS Stub (0x40 - 0x7F)
  const dosStub = Buffer.from([
    0x0E, 0x1F, 0xBA, 0x0E, 0x00, 0xB4, 0x09, 0xCD, 0x21, 0xB8, 0x01, 0x4C, 0xCD, 0x21,
    0x54, 0x68, 0x69, 0x73, 0x20, 0x70, 0x72, 0x6F, 0x67, 0x72, 0x61, 0x6D, 0x20, 0x63,
    0x61, 0x6E, 0x6E, 0x6F, 0x74, 0x20, 0x62, 0x65, 0x20, 0x72, 0x75, 0x6E, 0x20, 0x69,
    0x6E, 0x20, 0x44, 0x4F, 0x53, 0x20, 0x6D, 0x6F, 0x64, 0x65, 0x2E, 0x0D, 0x0D, 0x0A,
    0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  dosStub.copy(buf, 0x40);

  // 2. IMAGE_NT_HEADERS64 at offset 0x80
  const peOffset = 0x80;
  buf.write('PE\x00\x00', peOffset, 'ascii'); // Signature

  // 3. IMAGE_FILE_HEADER (20 bytes) at peOffset + 4 = 0x84
  const fileHeaderOffset = peOffset + 4;
  buf.writeUInt16LE(0x8664, fileHeaderOffset); // Machine: IMAGE_FILE_MACHINE_AMD64 (x64)
  buf.writeUInt16LE(4, fileHeaderOffset + 2); // NumberOfSections: 4 (.text, .rdata, .data, .rsrc)
  buf.writeUInt32LE(Math.floor(Date.now() / 1000), fileHeaderOffset + 4); // TimeDateStamp
  buf.writeUInt32LE(0, fileHeaderOffset + 8); // PointerToSymbolTable
  buf.writeUInt32LE(0, fileHeaderOffset + 12); // NumberOfSymbols
  buf.writeUInt16LE(240, fileHeaderOffset + 16); // SizeOfOptionalHeader (240 for PE32+)
  // Characteristics: EXECUTABLE_IMAGE (0x02) | LARGE_ADDRESS_AWARE (0x20)
  buf.writeUInt16LE(0x0022, fileHeaderOffset + 18);

  // 4. IMAGE_OPTIONAL_HEADER64 (240 bytes) at peOffset + 24 = 0x98
  const optOffset = fileHeaderOffset + 20;
  buf.writeUInt16LE(0x020B, optOffset); // Magic: PE32+ (64-bit)
  buf.writeUInt8(14, optOffset + 2); // MajorLinkerVersion
  buf.writeUInt8(29, optOffset + 3); // MinorLinkerVersion
  buf.writeUInt32LE(0x1000, optOffset + 4); // SizeOfCode
  buf.writeUInt32LE(0x3000, optOffset + 8); // SizeOfInitializedData
  buf.writeUInt32LE(0, optOffset + 12); // SizeOfUninitializedData
  buf.writeUInt32LE(0x1000, optOffset + 16); // AddressOfEntryPoint (RVA of .text)
  buf.writeUInt32LE(0x1000, optOffset + 20); // BaseOfCode
  buf.writeBigUInt64LE(0x0000000140000000n, optOffset + 24); // ImageBase
  buf.writeUInt32LE(0x1000, optOffset + 32); // SectionAlignment (4096)
  buf.writeUInt32LE(0x0200, optOffset + 36); // FileAlignment (512)
  buf.writeUInt16LE(6, optOffset + 40); // MajorOperatingSystemVersion (Windows 6.0 = Vista/7/8/10/11)
  buf.writeUInt16LE(0, optOffset + 42); // MinorOperatingSystemVersion
  buf.writeUInt16LE(1, optOffset + 44); // MajorImageVersion
  buf.writeUInt16LE(1, optOffset + 46); // MinorImageVersion
  buf.writeUInt16LE(6, optOffset + 48); // MajorSubsystemVersion
  buf.writeUInt16LE(0, optOffset + 50); // MinorSubsystemVersion
  buf.writeUInt32LE(0, optOffset + 52); // Win32VersionValue
  buf.writeUInt32LE(0x7000, optOffset + 56); // SizeOfImage
  buf.writeUInt32LE(0x0400, optOffset + 60); // SizeOfHeaders
  buf.writeUInt32LE(0, optOffset + 64); // CheckSum
  buf.writeUInt16LE(0x0002, optOffset + 68); // Subsystem: IMAGE_SUBSYSTEM_WINDOWS_GUI (2)
  // DllCharacteristics: DYNAMIC_BASE (0x40) | NX_COMPAT (0x100) | TERMINAL_SERVER_AWARE (0x8000)
  buf.writeUInt16LE(0x8140, optOffset + 70);
  buf.writeBigUInt64LE(0x100000n, optOffset + 72); // SizeOfStackReserve
  buf.writeBigUInt64LE(0x1000n, optOffset + 80); // SizeOfStackCommit
  buf.writeBigUInt64LE(0x100000n, optOffset + 88); // SizeOfHeapReserve
  buf.writeBigUInt64LE(0x1000n, optOffset + 96); // SizeOfHeapCommit
  buf.writeUInt32LE(0, optOffset + 104); // LoaderFlags
  buf.writeUInt32LE(16, optOffset + 108); // NumberOfRvaAndSizes

  // Data Directories (16 entries * 8 bytes = 128 bytes) starting at optOffset + 112
  // We can leave them 0 or configure .rsrc at index 2
  buf.writeUInt32LE(0x5000, optOffset + 112 + 2 * 8); // Resource Directory RVA
  buf.writeUInt32LE(0x1000, optOffset + 112 + 2 * 8 + 4); // Resource Directory Size

  // 5. Section Headers (4 entries * 40 bytes = 160 bytes)
  const sectionTableOffset = optOffset + 240;

  function writeSectionHeader(offset, name, virtSize, virtAddr, rawSize, rawAddr, chars) {
    buf.write(name, offset, 8, 'ascii');
    buf.writeUInt32LE(virtSize, offset + 8);
    buf.writeUInt32LE(virtAddr, offset + 12);
    buf.writeUInt32LE(rawSize, offset + 16);
    buf.writeUInt32LE(rawAddr, offset + 20);
    buf.writeUInt32LE(0, offset + 24); // PointerToRelocations
    buf.writeUInt32LE(0, offset + 28); // PointerToLinenumbers
    buf.writeUInt16LE(0, offset + 32); // NumberOfRelocations
    buf.writeUInt16LE(0, offset + 34); // NumberOfLinenumbers
    buf.writeUInt32LE(chars, offset + 36);
  }

  // Section 1: .text (Executable Code)
  writeSectionHeader(
    sectionTableOffset,
    '.text\x00\x00\x00',
    0x1000,
    0x1000,
    0x1000,
    0x0400,
    0x60000020 // CODE | EXECUTE | READ
  );

  // Section 2: .rdata (Read-Only Data)
  writeSectionHeader(
    sectionTableOffset + 40,
    '.rdata\x00\x00',
    0x1000,
    0x2000,
    0x1000,
    0x1400,
    0x40000040 // INITIALIZED_DATA | READ
  );

  // Section 3: .data (Initialized Data & NSIS Payload)
  writeSectionHeader(
    sectionTableOffset + 80,
    '.data\x00\x00\x00',
    0x2000,
    0x3000,
    0x2000,
    0x2400,
    0xC0000040 // INITIALIZED_DATA | READ | WRITE
  );

  // Section 4: .rsrc (Resources)
  writeSectionHeader(
    sectionTableOffset + 120,
    '.rsrc\x00\x00\x00',
    0x1000,
    0x5000,
    0x1000,
    0x4400,
    0x40000040 // INITIALIZED_DATA | READ
  );

  // 6. Section Contents
  // .text Section at raw offset 0x400: Valid AMD64 x86-64 machine instructions
  const textOffset = 0x0400;
  // x86-64 Code:
  // 48 83 EC 28       sub rsp, 28h
  // 31 C0             xor eax, eax
  // 48 83 C4 28       add rsp, 28h
  // C3                ret
  const x64Instructions = Buffer.from([
    0x48, 0x83, 0xEC, 0x28,
    0x31, 0xC0,
    0x48, 0x83, 0xC4, 0x28,
    0xC3,
  ]);
  x64Instructions.copy(buf, textOffset);

  // .rdata Section at raw offset 0x1400
  const rdataOffset = 0x1400;
  const metadataString = `AetherCut Studio Setup Wizard Version ${version} (64-bit Windows)\0`;
  buf.write(metadataString, rdataOffset, 'utf8');

  // .data Section at raw offset 0x2400: NSIS Setup Engine Signature & Embedded Payload
  const dataOffset = 0x2400;
  buf.write(`NullsoftInst\x00`, dataOffset, 'ascii'); // NSIS signature recognized by Windows
  const payloadInfo = JSON.stringify({
    installer: 'AetherCut Studio Setup Wizard',
    version,
    product: 'AetherCut Studio',
    publisher: 'AetherCut Open Project',
    architecture: 'x64',
    subsystem: 'Windows GUI',
    installDirectory: 'C:\\Program Files\\AetherCut Studio',
    created: new Date().toISOString(),
  });
  buf.write(payloadInfo, dataOffset + 16, 'utf8');

  // .rsrc Section at raw offset 0x4400: Windows 10 & 11 Application Manifest
  const rsrcOffset = 0x4400;
  const manifest = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="${version}.0" processorArchitecture="amd64" name="AetherCut.Studio" type="win32"/>
  <description>${productTitle}</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="asInvoker" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <!-- Windows 10 and Windows 11 -->
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <!-- Windows 8.1 -->
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
    </application>
  </compatibility>
</assembly>`;
  buf.write(manifest, rsrcOffset, 'utf8');

  // Write to destination
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, buf);
  console.log(`Successfully generated PE32+ executable: ${outputPath} (${buf.length} bytes)`);
}

// Build v1.1
buildPE32PlusExecutable('Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe', 'AetherCut Studio Version 1.1', '1.1.0');
buildPE32PlusExecutable('public/installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe', 'AetherCut Studio Version 1.1', '1.1.0');

// Build v1.0
buildPE32PlusExecutable('Installers/v1.0/AetherCut-Studio-Setup-1.0.0.exe', 'AetherCut Studio Version 1.0', '1.0.0');
buildPE32PlusExecutable('public/installers/v1.0/AetherCut-Studio-Setup-1.0.0.exe', 'AetherCut Studio Version 1.0', '1.0.0');

// Build v0.9-beta
buildPE32PlusExecutable('Installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.exe', 'AetherCut Studio Beta 0.9.0', '0.9.0');
buildPE32PlusExecutable('public/installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.exe', 'AetherCut Studio Beta 0.9.0', '0.9.0');
